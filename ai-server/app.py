"""
DerMind AI Server — FastAPI
============================
Endpoints:
  GET  /health         — Sunucu + model sağlık kontrolü
  GET  /metrics        — Uptime, cache istatistikleri, LLM error rate
  POST /score          — Kişiselleştirilmiş puan tahmini
  POST /score/batch    — Çoklu ürün puanlama (maks 50)
  POST /recommend      — KNN ürün önerisi (allergen text-match filtre)
  POST /explain        — SHAP XAI + LLM açıklaması (tek seferlik)
  POST /explain/stream — SSE streaming SHAP + LLM (TTFB ~300ms)

Tracing: OTEL_ENABLED=true ile OpenTelemetry / OTLP exporter aktif

Çalıştırma:
  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
import json
import time
import logging
import threading
import warnings
import hashlib
import asyncio

import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
import shap

from contextlib import asynccontextmanager
from collections import defaultdict
from typing import Optional

from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sklearn.neighbors import NearestNeighbors
from dotenv import load_dotenv
from openai import OpenAI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from features import (
    SCORING_FEATURES as EXPECTED_SCORING_FEATURES,
    KNN_FEATURES as EXPECTED_KNN_FEATURES,
    SKIN_ONE_HOT,
    VALID_SKIN_TYPES,
)

# ─────────────────────────────────────────────
# OpenTelemetry — opsiyonel (paket yoksa devre dışı)
# ─────────────────────────────────────────────
OTEL_ENABLED = os.getenv("OTEL_ENABLED", "false").lower() == "true"
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
OTEL_SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "dermind-ai-server")

_otel_tracer = None
if OTEL_ENABLED:
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.requests import RequestsInstrumentor

        resource = Resource(attributes={"service.name": OTEL_SERVICE_NAME})
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        RequestsInstrumentor().instrument()
        _otel_tracer = trace.get_tracer(__name__)
        # FastAPI instrumentation aşağıda app oluşturulduktan sonra yapılır
    except ImportError as exc:
        OTEL_ENABLED = False
        # logger henüz tanımlı değil — print ile uyar
        print(f"[WARN] OpenTelemetry paketi yüklü değil ({exc}); tracing devre dışı.")
    except Exception as exc:
        OTEL_ENABLED = False
        print(f"[WARN] OpenTelemetry başlatma hatası ({exc}); tracing devre dışı.")

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
load_dotenv()

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dermind-ai")

# ─────────────────────────────────────────────
# ENV CONFIG
# ─────────────────────────────────────────────
LLM_PROVIDER     = os.getenv("LLM_PROVIDER", "ollama").lower()
OLLAMA_HOST      = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
OLLAMA_MODEL     = os.getenv("OLLAMA_MODEL", "llama3.1")
OPENAI_KEY       = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL     = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
ALLOWED_ORIGINS  = os.getenv("ALLOWED_ORIGINS", "*").split(",")

if LLM_PROVIDER == "openai" and OPENAI_KEY:
    llm_client = OpenAI(api_key=OPENAI_KEY)
    llm_model  = OPENAI_MODEL
    logger.info(f"LLM: OpenAI ({llm_model})")
else:
    llm_client = OpenAI(base_url=f"{OLLAMA_HOST}/v1", api_key="ollama")
    llm_model  = OLLAMA_MODEL
    logger.info(f"LLM: Ollama ({llm_model}) @ {OLLAMA_HOST}")

# ─────────────────────────────────────────────
# CACHE  —  TTL + thread-safe lock
# ─────────────────────────────────────────────
_CACHE_TTL      = int(os.getenv("EXPLAIN_CACHE_TTL", 3600))   # saniye, default 1 saat
_CACHE_MAX_SIZE = int(os.getenv("EXPLAIN_CACHE_MAX", 500))

# SHAP açıklaması için minimum etki eşiği (bu altı görmezden gelinir)
SHAP_EFFECT_THRESHOLD = float(os.getenv("SHAP_EFFECT_THRESHOLD", 0.01))

# /explain için rate limit (dakika başına istek)
EXPLAIN_RATE_LIMIT     = os.getenv("EXPLAIN_RATE_LIMIT", "10/minute")
SCORE_RATE_LIMIT       = os.getenv("SCORE_RATE_LIMIT", "60/minute")
RECOMMEND_RATE_LIMIT   = os.getenv("RECOMMEND_RATE_LIMIT", "30/minute")

_explain_cache: TTLCache = TTLCache(maxsize=_CACHE_MAX_SIZE, ttl=_CACHE_TTL)
_cache_lock = threading.Lock()

def _cache_get(key: str) -> Optional[str]:
    with _cache_lock:
        return _explain_cache.get(key)

def _cache_set(key: str, value: str) -> None:
    with _cache_lock:
        _explain_cache[key] = value

# ─────────────────────────────────────────────
# METRICS COUNTERS
# ─────────────────────────────────────────────
_startup_time   = 0.0
_request_counts: dict[str, int] = defaultdict(int)   # "METHOD /path" -> count
_cache_hits     = 0
_cache_misses   = 0
_llm_errors     = 0
_llm_calls      = 0
_counts_lock    = threading.Lock()

def _inc_request(method: str, path: str) -> None:
    with _counts_lock:
        _request_counts[f"{method} {path}"] += 1

def _inc_cache_hit() -> None:
    global _cache_hits
    with _counts_lock:
        _cache_hits += 1

def _inc_cache_miss() -> None:
    global _cache_misses
    with _counts_lock:
        _cache_misses += 1

def _inc_llm_error() -> None:
    global _llm_errors
    with _counts_lock:
        _llm_errors += 1

def _inc_llm_call() -> None:
    global _llm_calls
    with _counts_lock:
        _llm_calls += 1

# ─────────────────────────────────────────────
# GLOBAL MODEL HANDLES  (lifespan'da doldurulur)
# ─────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

CONFIG           = None
SCORING_FEATURES = None
KNN_FEATURES     = None
xgb_model        = None
shap_explainer   = None
knn_model        = None
scaler           = None
product_df       = None
_product_index: dict[str, int] = {}   # product_id → row index (O(1) lookup)
_dataset_medians: dict[str, float] = {}   # /recommend için "ortalama kullanıcı" referansı


def _load_models() -> None:
    global CONFIG, SCORING_FEATURES, KNN_FEATURES
    global xgb_model, shap_explainer, knn_model, scaler, product_df, _product_index, _dataset_medians

    def _require(path: str, hint: str) -> None:
        if not os.path.exists(path):
            raise FileNotFoundError(f"{path}\n  → {hint}")

    _require(
        os.path.join(MODELS_DIR, "model_config.json"),
        "train_models_v2.py çalıştırarak model_config.json oluşturun.",
    )
    _require(
        os.path.join(MODELS_DIR, "xgboost_scoring_model.json"),
        "train_models_v2.py çalıştırarak xgboost_scoring_model.json oluşturun.",
    )

    with open(os.path.join(MODELS_DIR, "model_config.json"), encoding="utf-8") as f:
        CONFIG = json.load(f)

    SCORING_FEATURES = CONFIG["scoring_features"]
    KNN_FEATURES     = CONFIG["knn_features"]

    # features.py ile model_config.json arasında drift varsa uyar
    # (eğitilen model ile inference kodu farklı feature set kullanmasın)
    if list(SCORING_FEATURES) != list(EXPECTED_SCORING_FEATURES):
        logger.warning(
            "DRIFT: model_config.json scoring_features != features.py SCORING_FEATURES. "
            "Modeli yeni feature seti ile yeniden eğitin."
        )
    if list(KNN_FEATURES) != list(EXPECTED_KNN_FEATURES):
        logger.warning(
            "DRIFT: model_config.json knn_features != features.py KNN_FEATURES. "
            "Modeli yeni feature seti ile yeniden eğitin."
        )

    xgb_model = xgb.XGBRegressor()
    xgb_model.load_model(os.path.join(MODELS_DIR, "xgboost_scoring_model.json"))

    shap_explainer = joblib.load(os.path.join(MODELS_DIR, "shap_explainer.pkl"))
    knn_model      = joblib.load(os.path.join(MODELS_DIR, "knn_recommender_model.pkl"))
    scaler         = joblib.load(os.path.join(MODELS_DIR, "feature_scaler.pkl"))

    product_df     = pd.read_csv(os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv"))

    # O(1) lookup index — pandas boolean mask yerine dict
    _product_index = {pid: i for i, pid in enumerate(product_df["product_id"].astype(str))}

    # /recommend için "ortalama kullanıcı" referansı (mean değil median — outlier'a dayanıklı)
    median_features = [
        "ingredient_count", "rating", "price_usd",
        "banned_count", "restricted_count", "penalty_score",
    ]
    _dataset_medians = {}
    for feat in median_features:
        if feat in product_df.columns:
            val = product_df[feat].median()
            _dataset_medians[feat] = float(val) if pd.notna(val) else 0.0
        else:
            _dataset_medians[feat] = 0.0
    logger.info(f"Dataset medians: {_dataset_medians}")

    # Allergen text matching için ingredients_text varsa lowercase normalize et
    if "ingredients_text" in product_df.columns:
        product_df["ingredients_text"] = product_df["ingredients_text"].fillna("").astype(str).str.lower()
        nonempty = (product_df["ingredients_text"].str.len() > 0).sum()
        logger.info(f"Allergen matching: ingredients_text kolonu mevcut ({nonempty:,} ürün)")
    else:
        logger.warning(
            "Allergen matching: ingredients_text kolonu YOK. "
            "build_dataset_v2.py'yi yeniden çalıştırın — allergen text matching devre dışı."
        )

    logger.info(f"XGBoost  : OK  (best_iter={CONFIG.get('xgb_best_iteration', '?')})")
    logger.info(f"SHAP     : OK")
    logger.info(f"KNN      : OK  ({len(product_df):,} ürün, {len(KNN_FEATURES)} özellik)")
    logger.info(f"Index    : {len(_product_index):,} ürün indekslendi")


def _check_llm_health() -> bool:
    """LLM sağlayıcısına basit bir bağlantı testi yapar. Hata durumunda False döner."""
    try:
        if LLM_PROVIDER == "openai" and OPENAI_KEY:
            # OpenAI: list models endpoint ucuz bir health check
            llm_client.models.list()
            logger.info(f"LLM health: OpenAI ({llm_model}) erişilebilir.")
            return True
        # Ollama: /api/tags endpoint'ini direkt HTTP ile dene
        import urllib.request
        import urllib.error
        url = f"{OLLAMA_HOST.rstrip('/')}/api/tags"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                logger.info(f"LLM health: Ollama ({llm_model}) @ {OLLAMA_HOST} erişilebilir.")
                return True
            logger.warning(f"LLM health: Ollama beklenmeyen durum kodu {resp.status}")
            return False
    except Exception as exc:
        logger.warning(
            f"LLM health: {LLM_PROVIDER} erişilemiyor ({exc}). "
            "Sunucu kalkacak, ancak /explain çağrıları LLM hatası dönebilir."
        )
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _startup_time
    logger.info("─── Startup: modeller yükleniyor... ───")
    try:
        _load_models()
        _startup_time = time.time()
        logger.info("─── Tüm modeller hazır. ───")
    except FileNotFoundError as exc:
        logger.error(f"KRITIK — model yüklenemedi:\n{exc}")
        raise

    # LLM bağlantı testi (hatalı bile olsa sunucu kalkar — /explain dışındaki endpoint'ler etkilenmez)
    _check_llm_health()

    yield
    logger.info("─── Shutdown ───")


# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI(
    title="DerMind AI Server",
    description="Kişiselleştirilmiş kozmetik puanlama ve öneri API'si",
    version="2.2",
    lifespan=lifespan,
)

# ── OpenTelemetry FastAPI instrumentation ──
if OTEL_ENABLED:
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        logger.info(f"OpenTelemetry: tracing aktif → {OTEL_ENDPOINT} (service={OTEL_SERVICE_NAME})")
    except Exception as exc:
        logger.warning(f"OpenTelemetry FastAPI instrument hatası: {exc}")

# ── Rate Limiter ──
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request Timing + Access Log Middleware ──
@app.middleware("http")
async def timing_middleware(request: Request, call_next) -> Response:
    t0 = time.perf_counter()
    response: Response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
    _inc_request(request.method, request.url.path)
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code}  ({elapsed_ms:.1f}ms)"
    )
    return response


# ─────────────────────────────────────────────
# INTERNAL AUTH  (opsiyonel — .env'de boşsa devre dışı)
# ─────────────────────────────────────────────
def verify_internal_key(x_internal_key: Optional[str] = Header(default=None)) -> None:
    if INTERNAL_API_KEY and x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim.")


# ─────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# ─────────────────────────────────────────────
MAX_ALLERGIES    = 20
MAX_BATCH_SIZE   = 50


class UserProfile(BaseModel):
    skin_type: str = Field(..., description="dry | oily | combination | normal")
    has_acne:  bool = False
    allergies: list[str] = Field(default_factory=list, max_length=MAX_ALLERGIES)

    @field_validator("skin_type")
    @classmethod
    def check_skin_type(cls, v: str) -> str:
        n = v.strip().lower()
        if n not in VALID_SKIN_TYPES:
            raise ValueError(
                f"skin_type '{v}' geçersiz. Geçerli değerler: dry | oily | combination | normal"
            )
        return n

    @field_validator("allergies")
    @classmethod
    def check_allergies(cls, v: list[str]) -> list[str]:
        if len(v) > MAX_ALLERGIES:
            raise ValueError(f"allergies listesi en fazla {MAX_ALLERGIES} eleman içerebilir.")
        return [a.strip().lower() for a in v if a.strip()]


class ScoreRequest(BaseModel):
    sephora_product_id: str = Field(..., description="Örn: 'P476416'")
    user:               UserProfile
    is_recommended:     Optional[float] = Field(
        None, ge=0.0, le=1.0,
        description="Ürünün gerçek öneri oranı (0-1). "
                    "Belirtilmezse 0.5 (nötr) kullanılır. "
                    "Backend'den UserProductRating.wouldRecommend ortalaması gönderilebilir.",
    )


class BatchScoreRequest(BaseModel):
    sephora_product_ids: list[str] = Field(..., min_length=1, max_length=MAX_BATCH_SIZE)
    user:                UserProfile
    is_recommended:      Optional[float] = Field(None, ge=0.0, le=1.0)


class RecommendRequest(BaseModel):
    user:               UserProfile
    category:           Optional[str] = Field(None, description="Skincare | Makeup | Bath & Body")
    secondary_category: Optional[str] = Field(None, description="Sunscreen | Moisturizers | ...")
    top_k:              int = Field(5, ge=1, le=20)


class ExplainRequest(BaseModel):
    sephora_product_id: str
    user:               UserProfile
    language:           str = Field("tr", description="'tr' veya 'en'")
    is_recommended:     Optional[float] = Field(None, ge=0.0, le=1.0)


# ─────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────
def get_product_row(sephora_product_id: str) -> pd.Series:
    """O(1) ürün satırı erişimi — pandas mask yerine önceden oluşturulmuş index."""
    idx = _product_index.get(sephora_product_id)
    if idx is None:
        raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {sephora_product_id}")
    return product_df.iloc[idx]


def find_matching_allergens(ingredients_text: str, user_allergies: list[str]) -> list[str]:
    """
    Ürünün ingredients metni içinde kullanıcının allergen listesinden geçenleri döner.
    Substring match (case-insensitive) — "fragrance" "fragrance oil"u da yakalar.
    Boş list = ürün güvenli.
    """
    if not ingredients_text or not user_allergies:
        return []
    text = ingredients_text.lower()
    matched = []
    for allergen in user_allergies:
        a = allergen.strip().lower()
        if a and a in text:
            matched.append(a)
    return matched


def filter_by_allergens(df: pd.DataFrame, user_allergies: list[str]) -> pd.DataFrame:
    """
    DataFrame'den kullanıcının allergen'ini ingredients metninde içeren ürünleri çıkarır.
    ingredients_text kolonu yoksa veya allergies boşsa orijinal df döner.
    """
    if not user_allergies or "ingredients_text" not in df.columns:
        return df
    allergens_lower = [a.strip().lower() for a in user_allergies if a.strip()]
    if not allergens_lower:
        return df
    # Tek regex ile hepsini kontrol et — substring OR
    import re
    pattern = "|".join(re.escape(a) for a in allergens_lower)
    mask = ~df["ingredients_text"].str.contains(pattern, regex=True, na=False)
    return df[mask]


def build_scoring_input(
    product: pd.Series,
    user: UserProfile,
    is_recommended: Optional[float] = None,
) -> pd.DataFrame:
    """Kullanıcı + ürün → XGBoost input vektörü."""
    skin = SKIN_ONE_HOT[user.skin_type]
    row  = {f: 0 for f in SCORING_FEATURES}
    row.update(skin)

    for col in SCORING_FEATURES:
        if col in product.index and col not in skin:
            val = product[col]
            row[col] = 0 if pd.isna(val) else float(val)

    # Alerji: penalty artır
    if user.allergies:
        row["banned_count"]  = row.get("banned_count",  0) + len(user.allergies)
        row["penalty_score"] = row.get("penalty_score", 0) + len(user.allergies) * 3

    # is_recommended: caller'dan gelirse kullan, yoksa nötr 0.5
    row["is_recommended"] = is_recommended if is_recommended is not None else 0.5

    return pd.DataFrame([row])[SCORING_FEATURES]


def _trace_span(name: str):
    """OpenTelemetry varsa span aç, yoksa no-op context manager döner."""
    if _otel_tracer is not None:
        return _otel_tracer.start_as_current_span(name)
    from contextlib import nullcontext
    return nullcontext()


def _score_single(
    product: pd.Series,
    user: UserProfile,
    is_recommended: Optional[float] = None,
) -> dict:
    with _trace_span("xgb.predict"):
        x = build_scoring_input(product, user, is_recommended)
        personal_score = float(np.clip(xgb_model.predict(x)[0], 1, 10))
    base_score     = float(product.get("base_score", personal_score))

    # Allergen text matching — ürün kullanıcı için tehlikeli mi?
    allergen_matches: list[str] = []
    if user.allergies and "ingredients_text" in product.index:
        ing_text = product.get("ingredients_text", "")
        if isinstance(ing_text, str) and ing_text:
            allergen_matches = find_matching_allergens(ing_text, user.allergies)

    return {
        "product_id":     str(product["product_id"]),
        "product_name":   product["product_name"],
        "brand":          product["brand_name"],
        "base_score":     round(base_score, 1),
        "personal_score": round(personal_score, 1),
        "skin_type":      user.skin_type,
        "allergen_warnings": allergen_matches,  # Boş list = güvenli
    }


# ─────────────────────────────────────────────
# ENDPOINT — GET /health
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":         "ok",
        "model":          CONFIG["best_model"],
        "version":        CONFIG["version"],
        "total_products": CONFIG["total_products"],
        "xgb_r2":         CONFIG["xgb_metrics"]["r2"],
    }


# ─────────────────────────────────────────────
# ENDPOINT — GET /metrics
# ─────────────────────────────────────────────
@app.get("/metrics")
def metrics():
    with _cache_lock:
        cache_size = len(_explain_cache)
    with _counts_lock:
        hits        = _cache_hits
        misses      = _cache_misses
        llm_calls   = _llm_calls
        llm_errors  = _llm_errors
        req_snapshot = dict(_request_counts)

    total_explain = hits + misses
    hit_rate = round(hits / total_explain * 100, 1) if total_explain > 0 else 0.0
    llm_error_rate = round(llm_errors / llm_calls * 100, 1) if llm_calls > 0 else 0.0

    return {
        "uptime_seconds":    round(time.time() - _startup_time, 1),
        "cache": {
            "size":       cache_size,
            "maxsize":    _CACHE_MAX_SIZE,
            "ttl_seconds":_CACHE_TTL,
            "hits":       hits,
            "misses":     misses,
            "hit_rate_pct": hit_rate,
        },
        "llm": {
            "provider":       LLM_PROVIDER,
            "model":          llm_model,
            "calls":          llm_calls,
            "errors":         llm_errors,
            "error_rate_pct": llm_error_rate,
        },
        "request_counts": req_snapshot,
        "model": {
            "total_products": len(product_df) if product_df is not None else 0,
            "scoring_features": len(SCORING_FEATURES) if SCORING_FEATURES else 0,
            "knn_features":     len(KNN_FEATURES)     if KNN_FEATURES     else 0,
        },
    }


# ─────────────────────────────────────────────
# ENDPOINT — POST /score
# ─────────────────────────────────────────────
@app.post("/score", dependencies=[Depends(verify_internal_key)])
@limiter.limit(SCORE_RATE_LIMIT)
async def score(request: Request, req: ScoreRequest):
    """
    Bir ürünün base ve kişiselleştirilmiş puanını döner.

    `is_recommended` opsiyonel: Spring Boot'tan kullanıcının ürüne verdiği
    tavsiye oranı (UserProductRating.wouldRecommend ortalaması) gönderilebilir.
    """
    product = get_product_row(req.sephora_product_id)
    return await asyncio.to_thread(_score_single, product, req.user, req.is_recommended)


# ─────────────────────────────────────────────
# ENDPOINT — POST /score/batch
# ─────────────────────────────────────────────
def _score_batch_sync(product_ids: list[str], user: "UserProfile", is_recommended: Optional[float]) -> dict:
    results, errors = [], []
    for pid in product_ids:
        idx = _product_index.get(pid)
        if idx is None:
            errors.append({"product_id": pid, "error": "Ürün bulunamadı"})
        else:
            try:
                results.append(_score_single(product_df.iloc[idx], user, is_recommended))
            except Exception as exc:
                errors.append({"product_id": pid, "error": str(exc)})
    return {"results": results, "errors": errors}


@app.post("/score/batch", dependencies=[Depends(verify_internal_key)])
@limiter.limit(SCORE_RATE_LIMIT)
async def score_batch(request: Request, req: BatchScoreRequest):
    """Tek çağrıda birden fazla ürünü puanlar (maks 50)."""
    return await asyncio.to_thread(
        _score_batch_sync, req.sephora_product_ids, req.user, req.is_recommended
    )


# ─────────────────────────────────────────────
# ENDPOINT — POST /recommend
# ─────────────────────────────────────────────
def _recommend_sync(req: "RecommendRequest") -> dict:
    skin        = SKIN_ONE_HOT[req.user.skin_type]
    user_vector = {f: 0.0 for f in KNN_FEATURES}
    # "Ortalama kullanıcı" referansı — keyfi sabit yerine dataset median'ları
    # banned_count ve penalty_score için 0 (kullanıcı tehlikesiz ürün ister)
    user_vector.update({
        "ingredient_count": _dataset_medians.get("ingredient_count", 20),
        "banned_count":     0,
        "restricted_count": 0,
        "penalty_score":    0,
        "rating":           _dataset_medians.get("rating",   4.5),
        "price_usd":        _dataset_medians.get("price_usd", 35.0),
    })

    skin_type = req.user.skin_type
    if skin_type == "dry":
        user_vector["good_for_dry"]     = 5
        user_vector["good_for_barrier"] = 3
        user_vector["avoid_dry"]        = 0
    elif skin_type in ("oily", "combination"):
        user_vector["good_for_oily"] = 5
        user_vector["avoid_oily"]    = 0
    if req.user.has_acne:
        user_vector["good_for_acne"] = 4

    # Alerjisi olan kullanıcı için düşük penalty_score'lu ürünleri çek
    if req.user.allergies:
        user_vector["penalty_score"] = 0

    # Kategori filtresi
    filtered = product_df
    has_category_filter = bool(req.category or req.secondary_category)
    if req.category:
        filtered = filtered[filtered["primary_category"] == req.category]
    if req.secondary_category:
        filtered = filtered[filtered["secondary_category"] == req.secondary_category]

    if filtered.empty:
        raise HTTPException(status_code=404, detail="Bu kategoride ürün bulunamadı.")

    # Alerjisi olan kullanıcı için 3 katmanlı filtre:
    # (1) Ingredients text içinde allergen geçen ürünleri tamamen çıkar (en sıkı)
    # (2) banned=0 + restricted=0 (CosIng tabanlı)
    # (3) Sadece banned=0; yetmezse penalty median altı (son çare)
    has_allergy_filter = False
    if req.user.allergies:
        # (1) Text-level match — kesin tehlike
        text_safe = filter_by_allergens(filtered, req.user.allergies)
        if len(text_safe) >= req.top_k:
            filtered = text_safe
            has_allergy_filter = True
        else:
            # (2) CosIng strict
            strict = filtered[
                (filtered["banned_count"] == 0) & (filtered["restricted_count"] == 0)
            ]
            if len(strict) >= req.top_k:
                filtered = strict
                has_allergy_filter = True
            else:
                # (3) banned=0 → penalty median altı
                safe = filtered[filtered["banned_count"] == 0]
                if len(safe) >= req.top_k:
                    filtered = safe
                    has_allergy_filter = True
                elif "penalty_score" in filtered.columns and not filtered.empty:
                    med = filtered["penalty_score"].median()
                    low = filtered[filtered["penalty_score"] <= med]
                    if len(low) >= req.top_k:
                        filtered = low
                        has_allergy_filter = True

    user_scaled = scaler.transform(pd.DataFrame([user_vector])[KNN_FEATURES])

    # Kategori veya alerji filtresi yoksa önceden fit edilmiş knn_model'i kullan
    if not has_category_filter and not has_allergy_filter:
        k = min(req.top_k, len(product_df))
        distances, indices = knn_model.kneighbors(user_scaled, n_neighbors=k)
    else:
        knn_data_scaled = scaler.transform(filtered[KNN_FEATURES].fillna(0))
        k = min(req.top_k, len(filtered))
        knn_temp = NearestNeighbors(n_neighbors=k, metric="cosine", algorithm="brute")
        knn_temp.fit(knn_data_scaled)
        distances, indices = knn_temp.kneighbors(user_scaled)

    results = []
    for local_idx, dist in zip(indices[0], distances[0]):
        row = filtered.iloc[local_idx]
        results.append({
            "product_id":   str(row["product_id"]),
            "product_name": row["product_name"],
            "brand":        row["brand_name"],
            "category":     row.get("secondary_category") or row.get("primary_category"),
            "base_score":   round(float(row.get("base_score", 0)), 1),
            "similarity":   round(float(1 - dist), 3),
            "rating":       round(float(row["rating"]), 1),
            "price_usd":    None if pd.isna(row["price_usd"]) else float(row["price_usd"]),
        })

    return {
        "user_skin_type":  req.user.skin_type,
        "category_filter": req.secondary_category or req.category or "Tümü",
        "recommendations": results,
    }


@app.post("/recommend", dependencies=[Depends(verify_internal_key)])
@limiter.limit(RECOMMEND_RATE_LIMIT)
async def recommend(request: Request, req: RecommendRequest):
    """
    Kullanıcı profiline KNN ile en uygun ürünleri önerir.
    Kategori filtresi opsiyoneldir.
    """
    return await asyncio.to_thread(_recommend_sync, req)


# ─────────────────────────────────────────────
# LLM HELPERS
# ─────────────────────────────────────────────
FEATURE_LABELS_TR = {
    "is_recommended":      "kullanıcı tavsiyesi",
    "base_score":          "genel ürün kalitesi",
    "penalty_score":       "zararlı madde cezası",
    "banned_count":        "yasaklı madde sayısı",
    "restricted_count":    "kısıtlı madde sayısı",
    "ingredient_count":    "toplam içerik sayısı",
    "good_for_acne":       "akne için faydalı içerik",
    "good_for_oily":       "yağlı cilt için faydalı içerik",
    "good_for_dry":        "kuru cilt için faydalı içerik",
    "good_for_sensitive":  "hassas cilt için faydalı içerik",
    "good_for_aging":      "yaşlanma karşıtı içerik",
    "good_for_uv":         "UV koruma içeriği",
    "good_for_barrier":    "cilt bariyeri güçlendirici",
    "good_for_radiance":   "aydınlatıcı içerik",
    "good_for_texture":    "doku düzeltici içerik",
    "good_for_dark_circles": "göz altı içeriği",
    "good_for_pigmentation": "pigmentasyon içeriği",
    "avoid_oily":          "yağlı ciltte kaçınılması gereken madde",
    "avoid_dry":           "kuru ciltte kaçınılması gereken madde",
    "avoid_sensitive":     "hassas ciltte kaçınılması gereken madde",
    "avoid_combination":   "karma ciltte kaçınılması gereken madde",
    "avoid_pregnancy":     "hamilelikte kaçınılması gereken madde",
    "avoid_barrier":       "bariyer bozucu madde",
    "skin_dry":            "kuru cilt profili",
    "skin_oily":           "yağlı cilt profili",
    "skin_combination":    "karma cilt profili",
    "skin_normal":         "normal cilt profili",
}

FEATURE_LABELS_EN = {
    "is_recommended":        "user recommendation rate",
    "base_score":            "overall product quality",
    "penalty_score":         "harmful ingredient penalty",
    "banned_count":          "number of banned ingredients",
    "restricted_count":      "number of restricted ingredients",
    "ingredient_count":      "total ingredient count",
    "good_for_acne":         "acne-beneficial ingredient",
    "good_for_oily":         "oily skin beneficial ingredient",
    "good_for_dry":          "dry skin beneficial ingredient",
    "good_for_sensitive":    "sensitive skin beneficial ingredient",
    "good_for_aging":        "anti-aging ingredient",
    "good_for_uv":           "UV protection ingredient",
    "good_for_barrier":      "skin barrier strengthener",
    "good_for_pigmentation": "pigmentation-beneficial ingredient",
    "good_for_radiance":     "radiance-boosting ingredient",
    "good_for_texture":      "texture-improving ingredient",
    "good_for_dark_circles": "dark circle reducing ingredient",
    "avoid_oily":            "ingredient to avoid for oily skin",
    "avoid_dry":             "ingredient to avoid for dry skin",
    "avoid_sensitive":       "ingredient to avoid for sensitive skin",
    "avoid_combination":     "ingredient to avoid for combination skin",
    "avoid_pregnancy":       "ingredient to avoid during pregnancy",
    "avoid_barrier":         "skin barrier disruptor",
    "skin_dry":              "dry skin profile",
    "skin_oily":             "oily skin profile",
    "skin_combination":      "combination skin profile",
    "skin_normal":           "normal skin profile",
}


def _build_llm_prompt(
    product_name: str,
    base_score: float,
    personal_score: float,
    skin_type: str,
    has_acne: bool,
    top_factors: list[dict],
    language: str,
) -> str:
    labels       = FEATURE_LABELS_TR if language == "tr" else FEATURE_LABELS_EN
    factor_lines = []
    for f in top_factors[:5]:
        label = labels.get(f["feature"], f["feature"])
        sign  = "+" if f["effect"] > 0 else ""
        factor_lines.append(f"  - {label}: {sign}{f['effect']:.2f}")
    factors_text = "\n".join(factor_lines)

    if language == "tr":
        acne_note = "ve sivilceye meyilli" if has_acne else ""
        return (
            f"Sen bir dermatoloji asistanısın. "
            f"Kullanıcının cildi {skin_type} {acne_note}. "
            f"'{product_name}' ürününün genel kalite puanı {base_score:.1f}/10, "
            f"bu kullanıcıya özel puan ise {personal_score:.1f}/10.\n"
            f"Puanı etkileyen başlıca faktörler:\n{factors_text}\n\n"
            f"Bu bilgiyi kullanıcıya nazik, anlaşılır ve dermatolojik bir dille açıkla. "
            f"Maksimum 3 cümle. Teknik terimler kullanma, sade Türkçe kullan."
        )
    return (
        f"You are a dermatology assistant. "
        f"The user has {skin_type} skin{' with acne tendency' if has_acne else ''}. "
        f"'{product_name}' has a general quality score of {base_score:.1f}/10 "
        f"and a personalized score of {personal_score:.1f}/10 for this user.\n"
        f"Key factors:\n{factors_text}\n\n"
        f"Explain this in a friendly, dermatological tone. "
        f"Maximum 3 sentences. Plain language, no jargon."
    )


def _call_llm(prompt: str, cache_key: str) -> tuple[str, bool, bool]:
    """LLM çağrısı. (yanıt, cache_hit, llm_error) döner. Hata durumunda cache'lenmez."""
    cached = _cache_get(cache_key)
    if cached is not None:
        _inc_cache_hit()
        return cached, True, False

    _inc_cache_miss()
    _inc_llm_call()
    try:
        with _trace_span("llm.chat.completions"):
            response = llm_client.chat.completions.create(
                model=llm_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7,
            )
        if not response or not response.choices:
            raise ValueError("LLM returned empty response")
        message = response.choices[0].message
        content = getattr(message, "content", None)
        if content is None:
            raise ValueError("LLM returned null content")
        text = content.strip()
        if not text:
            raise ValueError("LLM returned empty content")
        _cache_set(cache_key, text)  # Sadece başarılı yanıt cache'lenir
        return text, False, False
    except Exception as exc:
        _inc_llm_error()
        logger.error(f"LLM hatası: {exc}")
        return f"LLM hatası: {exc}", False, True


# ─────────────────────────────────────────────
# ENDPOINT — POST /explain
# ─────────────────────────────────────────────
@app.post("/explain", dependencies=[Depends(verify_internal_key)])
@limiter.limit(EXPLAIN_RATE_LIMIT)
async def explain(request: Request, req: ExplainRequest):
    """
    SHAP ile puanı etkileyen faktörleri hesaplar,
    LLM (Ollama / OpenAI) ile kullanıcıya doğal dilde açıklar.

    Cache: product_id + skin_type + has_acne + allergies + language kombinasyonu için
    tekrar LLM çağrısı yapılmaz (TTL: {_CACHE_TTL}s).
    """
    product = get_product_row(req.sephora_product_id)
    x       = build_scoring_input(product, req.user, req.is_recommended)

    # CPU-bound XGBoost + SHAP: thread pool'a al
    def _predict_and_shap():
        ps = float(np.clip(xgb_model.predict(x)[0], 1, 10))
        sv = shap_explainer(x)
        return ps, sv.values[0]

    personal_score, effects = await asyncio.to_thread(_predict_and_shap)
    base_score = float(product.get("base_score", personal_score))

    lang = req.language if req.language in ("tr", "en") else "tr"

    factors = []
    for feat, effect in zip(SCORING_FEATURES, effects):
        if abs(effect) > SHAP_EFFECT_THRESHOLD:
            direction = (
                ("INCREASES" if effect > 0 else "DECREASES")
                if lang == "en"
                else ("ARTIRAN" if effect > 0 else "DUSUREN")
            )
            factors.append({
                "feature":   feat,
                "effect":    round(float(effect), 3),
                "direction": direction,
            })
    factors.sort(key=lambda f: abs(f["effect"]), reverse=True)

    allergies_key = "_".join(sorted(req.user.allergies))
    cache_key     = hashlib.md5(
        f"{req.sephora_product_id}|{req.user.skin_type}|{req.user.has_acne}"
        f"|{allergies_key}|{req.is_recommended}|{lang}".encode()
    ).hexdigest()

    prompt       = _build_llm_prompt(
        product_name=product["product_name"],
        base_score=base_score,
        personal_score=personal_score,
        skin_type=req.user.skin_type,
        has_acne=req.user.has_acne,
        top_factors=factors,
        language=lang,
    )
    explanation, was_cached, llm_error = await asyncio.to_thread(
        _call_llm, prompt, cache_key
    )

    return {
        "product_id":     req.sephora_product_id,
        "product_name":   product["product_name"],
        "base_score":     round(base_score, 1),
        "personal_score": round(personal_score, 1),
        "language":       lang,
        "shap_factors":   factors[:10],
        "explanation":    explanation,
        "cached":         was_cached,
        "llm_error":      llm_error,
    }


# ─────────────────────────────────────────────
# ENDPOINT — POST /explain/stream  (Server-Sent Events)
# ─────────────────────────────────────────────
def _build_explain_context(req: ExplainRequest) -> dict:
    """SHAP + scoring + cache key — sync hesaplama, streaming başlamadan önce."""
    product = get_product_row(req.sephora_product_id)
    x       = build_scoring_input(product, req.user, req.is_recommended)
    personal_score = float(np.clip(xgb_model.predict(x)[0], 1, 10))
    base_score     = float(product.get("base_score", personal_score))
    shap_values = shap_explainer(x)
    effects     = shap_values.values[0]

    lang = req.language if req.language in ("tr", "en") else "tr"
    factors = []
    for feat, effect in zip(SCORING_FEATURES, effects):
        if abs(effect) > SHAP_EFFECT_THRESHOLD:
            direction = (
                ("INCREASES" if effect > 0 else "DECREASES")
                if lang == "en"
                else ("ARTIRAN" if effect > 0 else "DUSUREN")
            )
            factors.append({
                "feature":   feat,
                "effect":    round(float(effect), 3),
                "direction": direction,
            })
    factors.sort(key=lambda f: abs(f["effect"]), reverse=True)

    allergies_key = "_".join(sorted(req.user.allergies))
    cache_key     = hashlib.md5(
        f"{req.sephora_product_id}|{req.user.skin_type}|{req.user.has_acne}"
        f"|{allergies_key}|{req.is_recommended}|{lang}".encode()
    ).hexdigest()

    prompt = _build_llm_prompt(
        product_name=product["product_name"],
        base_score=base_score,
        personal_score=personal_score,
        skin_type=req.user.skin_type,
        has_acne=req.user.has_acne,
        top_factors=factors,
        language=lang,
    )
    return {
        "product_id":     req.sephora_product_id,
        "product_name":   product["product_name"],
        "base_score":     round(base_score, 1),
        "personal_score": round(personal_score, 1),
        "language":       lang,
        "shap_factors":   factors[:10],
        "prompt":         prompt,
        "cache_key":      cache_key,
    }


@app.post("/explain/stream", dependencies=[Depends(verify_internal_key)])
@limiter.limit(EXPLAIN_RATE_LIMIT)
async def explain_stream(request: Request, req: ExplainRequest):
    """
    Server-Sent Events (SSE) ile /explain'in streaming versiyonu.
    SHAP ve metadata anında, LLM açıklaması token-by-token akışla gelir.
    Latency: TTFB ~300ms (SHAP), tam yanıt ~30sn (Ollama).

    Event tipleri:
      - meta       : product info + shap_factors (cache hit'te tek event'de tüm açıklamayla)
      - token      : LLM'den gelen kısmi metin parçası
      - done       : Stream tamamlandı (final flag'ler: cached, llm_error)
    """
    ctx = await asyncio.to_thread(_build_explain_context, req)

    async def event_generator():
        # 1) Meta + SHAP (anında)
        meta = {
            "type": "meta",
            "product_id":     ctx["product_id"],
            "product_name":   ctx["product_name"],
            "base_score":     ctx["base_score"],
            "personal_score": ctx["personal_score"],
            "language":       ctx["language"],
            "shap_factors":   ctx["shap_factors"],
        }
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        # 2) Cache hit'te streaming yapmadan tek seferde dön
        cached = _cache_get(ctx["cache_key"])
        if cached is not None:
            _inc_cache_hit()
            yield f"data: {json.dumps({'type': 'token', 'text': cached}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'cached': True, 'llm_error': False}, ensure_ascii=False)}\n\n"
            return

        # 3) Cache miss → LLM streaming
        _inc_cache_miss()
        _inc_llm_call()
        full_text_parts: list[str] = []
        llm_error = False

        def _open_stream():
            return llm_client.chat.completions.create(
                model=llm_model,
                messages=[{"role": "user", "content": ctx["prompt"]}],
                max_tokens=200,
                temperature=0.7,
                stream=True,
            )

        try:
            stream = await asyncio.to_thread(_open_stream)
            for chunk in stream:
                try:
                    delta = chunk.choices[0].delta
                    piece = getattr(delta, "content", None)
                    if piece:
                        full_text_parts.append(piece)
                        yield f"data: {json.dumps({'type': 'token', 'text': piece}, ensure_ascii=False)}\n\n"
                except (IndexError, AttributeError):
                    continue
        except Exception as exc:
            _inc_llm_error()
            llm_error = True
            logger.error(f"LLM stream hatası: {exc}")
            err_text = f"LLM hatası: {exc}"
            yield f"data: {json.dumps({'type': 'token', 'text': err_text}, ensure_ascii=False)}\n\n"

        # 4) Cache'le (sadece başarılı yanıt)
        if not llm_error:
            full_text = "".join(full_text_parts).strip()
            if full_text:
                _cache_set(ctx["cache_key"], full_text)

        yield f"data: {json.dumps({'type': 'done', 'cached': False, 'llm_error': llm_error}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx buffering kapalı
        },
    )
