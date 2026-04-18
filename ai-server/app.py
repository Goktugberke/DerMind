"""
DerMind AI Server — FastAPI
============================
Endpoint'ler:
  POST /score      — Kişiselleştirilmiş puan tahmini
  POST /recommend  — KNN ürün önerisi
  POST /explain    — SHAP XAI + OpenAI LLM açıklaması

Çalıştırma:
  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
import json
import warnings
import hashlib
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
import shap

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from sklearn.neighbors import NearestNeighbors
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── LLM Client kurulumu (.env'e gore secilir) ──
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()  # ollama | openai
OLLAMA_HOST  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if LLM_PROVIDER == "openai" and OPENAI_KEY:
    llm_client = OpenAI(api_key=OPENAI_KEY)
    llm_model  = OPENAI_MODEL
    print(f"LLM: OpenAI ({llm_model})")
else:
    # Ollama, OpenAI-uyumlu API sundugu icin ayni client calisir
    llm_client = OpenAI(base_url=f"{OLLAMA_HOST}/v1", api_key="ollama")
    llm_model  = OLLAMA_MODEL
    print(f"LLM: Ollama ({llm_model}) @ {OLLAMA_HOST}")

# Response cache: {cache_key: llm_response} — max 500 girdi (bellek sızıntısı önlemi)
_explain_cache: dict[str, str] = {}
_CACHE_MAX_SIZE = 500

# ─────────────────────────────────────────────
# MODEL YÜKLEMESİ (startup'ta bir kez yapılır)
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

print("Modeller yükleniyor...")

with open(os.path.join(MODELS_DIR, "model_config.json"), encoding="utf-8") as f:
    CONFIG = json.load(f)

SCORING_FEATURES = CONFIG["scoring_features"]
KNN_FEATURES = CONFIG["knn_features"]

# XGBoost — ana puanlama modeli
xgb_model = xgb.XGBRegressor()
xgb_model.load_model(os.path.join(MODELS_DIR, "xgboost_scoring_model.json"))

# SHAP explainer
shap_explainer = joblib.load(os.path.join(MODELS_DIR, "shap_explainer.pkl"))

# KNN + scaler
knn_model = joblib.load(os.path.join(MODELS_DIR, "knn_recommender_model.pkl"))
scaler = joblib.load(os.path.join(MODELS_DIR, "feature_scaler.pkl"))

# Ürün vektörleri (KNN için)
product_df = pd.read_csv(os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv"))

print(f"  XGBoost: OK")
print(f"  SHAP: OK")
print(f"  KNN: OK ({len(product_df)} ürün)")
print("Modeller hazır.\n")

# ─────────────────────────────────────────────
# FASTAPI UYGULAMASI
# ─────────────────────────────────────────────
app = FastAPI(
    title="DerMind AI Server",
    description="Kişiselleştirilmiş kozmetik puanlama ve öneri API'si",
    version="2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# ŞEMALAR (Request / Response modelleri)
# ─────────────────────────────────────────────

class UserProfile(BaseModel):
    skin_type: str = Field(..., description="dry | oily | combination | normal")
    has_acne: bool = False
    allergies: list[str] = []

class ScoreRequest(BaseModel):
    sephora_product_id: str = Field(..., description="Örn: 'P476416'")
    user: UserProfile

class RecommendRequest(BaseModel):
    user: UserProfile
    category: Optional[str] = Field(None, description="Skincare | Makeup | Bath & Body")
    secondary_category: Optional[str] = Field(None, description="Sunscreen | Moisturizers | Cleansers...")
    top_k: int = Field(5, ge=1, le=20)

class ExplainRequest(BaseModel):
    sephora_product_id: str
    user: UserProfile
    language: str = Field("tr", description="Aciklama dili: 'tr' veya 'en'")

# ─────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────

SKIN_ONE_HOT = {
    "dry":         {"skin_dry": 1, "skin_oily": 0, "skin_combination": 0, "skin_normal": 0},
    "oily":        {"skin_dry": 0, "skin_oily": 1, "skin_combination": 0, "skin_normal": 0},
    "combination": {"skin_dry": 0, "skin_oily": 0, "skin_combination": 1, "skin_normal": 0},
    "normal":      {"skin_dry": 0, "skin_oily": 0, "skin_combination": 0, "skin_normal": 1},
}

def get_product_row(sephora_product_id: str) -> pd.Series:
    """Ürünü CSV'den bul, bulunamazsa hata fırlat."""
    row = product_df[product_df["product_id"] == sephora_product_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {sephora_product_id}")
    return row.iloc[0]

def build_scoring_input(product: pd.Series, user: UserProfile) -> pd.DataFrame:
    """Kullanıcı + ürün → model input vektörü."""
    skin = SKIN_ONE_HOT.get(user.skin_type.lower(), SKIN_ONE_HOT["normal"])
    row = {f: 0 for f in SCORING_FEATURES}

    # Cilt tipi one-hot
    row.update(skin)

    # Ürün özellikleri
    for col in SCORING_FEATURES:
        if col in product.index and col not in skin:
            val = product[col]
            row[col] = 0 if pd.isna(val) else float(val)

    # Alerji varsa penalty artır
    if user.allergies:
        row["banned_count"] = row.get("banned_count", 0) + len(user.allergies)
        row["penalty_score"] = row.get("penalty_score", 0) + len(user.allergies) * 3

    # is_recommended: bilinmiyor → 0.5
    row["is_recommended"] = 0.5

    return pd.DataFrame([row])[SCORING_FEATURES]

# ─────────────────────────────────────────────
# ENDPOINT 1 — POST /score
# ─────────────────────────────────────────────

@app.post("/score")
def score(req: ScoreRequest):
    """
    Bir ürünün base ve kişiselleştirilmiş puanını döner.

    - base_score: Kullanıcıdan bağımsız ürün kalite puanı
    - personal_score: Kullanıcının cilt tipine özel puan
    """
    product = get_product_row(req.sephora_product_id)
    x = build_scoring_input(product, req.user)

    personal_score = float(np.clip(xgb_model.predict(x)[0], 1, 10))
    base_score = float(product.get("base_score", personal_score))

    return {
        "product_id": req.sephora_product_id,
        "product_name": product["product_name"],
        "brand": product["brand_name"],
        "base_score": round(base_score, 1),
        "personal_score": round(personal_score, 1),
        "skin_type": req.user.skin_type,
    }

# ─────────────────────────────────────────────
# ENDPOINT 2 — POST /recommend
# ─────────────────────────────────────────────

@app.post("/recommend")
def recommend(req: RecommendRequest):
    """
    Kullanıcı profiline en uygun ürünleri KNN ile önerir.
    Kategori filtresi (category / secondary_category) opsiyoneldir.
    """
    # Kullanıcı vektörü oluştur
    skin = SKIN_ONE_HOT.get(req.user.skin_type.lower(), SKIN_ONE_HOT["normal"])
    user_vector = {f: 0.0 for f in KNN_FEATURES}
    user_vector.update({
        "ingredient_count": 20,
        "banned_count": 0,
        "restricted_count": 0,
        "penalty_score": 0,
        "rating": 4.5,
        "price_usd": 35,
    })

    # Cilt tipine göre tercihler
    skin_type = req.user.skin_type.lower()
    if skin_type == "dry":
        user_vector["good_for_dry"] = 5
        user_vector["good_for_barrier"] = 3
        user_vector["avoid_dry"] = 0
    elif skin_type in ("oily", "combination"):
        user_vector["good_for_oily"] = 5
        user_vector["avoid_oily"] = 0
    if req.user.has_acne:
        user_vector["good_for_acne"] = 4

    # Alerji varsa penalty
    if req.user.allergies:
        user_vector["penalty_score"] = 0  # temiz ürün istiyoruz

    # Kategori filtresi
    filtered = product_df.copy()
    if req.category:
        filtered = filtered[filtered["primary_category"] == req.category]
    if req.secondary_category:
        filtered = filtered[filtered["secondary_category"] == req.secondary_category]

    if filtered.empty:
        raise HTTPException(status_code=404, detail="Bu kategoride ürün bulunamadı.")

    # KNN uygula
    knn_data = filtered[KNN_FEATURES].fillna(0)
    knn_data_scaled = scaler.transform(knn_data)

    user_df = pd.DataFrame([user_vector])[KNN_FEATURES]
    user_scaled = scaler.transform(user_df)

    k = min(req.top_k, len(filtered))
    knn_temp = NearestNeighbors(n_neighbors=k, metric="cosine", algorithm="brute")
    knn_temp.fit(knn_data_scaled)
    distances, indices = knn_temp.kneighbors(user_scaled)

    results = []
    for local_idx, dist in zip(indices[0], distances[0]):
        row = filtered.iloc[local_idx]
        results.append({
            "product_id": row["product_id"],
            "product_name": row["product_name"],
            "brand": row["brand_name"],
            "category": row.get("secondary_category", row.get("primary_category")),
            "base_score": round(float(row.get("base_score", 0)), 1),
            "similarity": round(float(1 - dist), 3),
            "rating": round(float(row["rating"]), 1),
            "price_usd": float(row["price_usd"]) if not pd.isna(row["price_usd"]) else None,
        })

    return {
        "user_skin_type": req.user.skin_type,
        "category_filter": req.secondary_category or req.category or "Tümü",
        "recommendations": results,
    }

# ─────────────────────────────────────────────
# LLM YARDIMCI FONKSİYONU
# ─────────────────────────────────────────────

FEATURE_LABELS_TR = {
    "is_recommended":      "kullanıcı tavsiyesi",
    "base_score":          "genel ürün kalitesi",
    "penalty_score":       "zararlı madde cezası",
    "banned_count":        "yasaklı madde sayısı",
    "restricted_count":    "kısıtlı madde sayısı",
    "good_for_acne":       "akne için faydalı içerik",
    "good_for_oily":       "yağlı cilt için faydalı içerik",
    "good_for_dry":        "kuru cilt için faydalı içerik",
    "good_for_sensitive":  "hassas cilt için faydalı içerik",
    "good_for_aging":      "yaşlanma karşıtı içerik",
    "good_for_uv":         "UV koruma içeriği",
    "good_for_barrier":    "cilt bariyeri güçlendirici",
    "avoid_oily":          "yağlı ciltte kaçınılması gereken madde",
    "avoid_dry":           "kuru ciltte kaçınılması gereken madde",
    "avoid_sensitive":     "hassas ciltte kaçınılması gereken madde",
    "skin_dry":            "kuru cilt profili",
    "skin_oily":           "yağlı cilt profili",
    "skin_combination":    "karma cilt profili",
    "skin_normal":         "normal cilt profili",
}

FEATURE_LABELS_EN = {
    "is_recommended":        "user recommendation",
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
    "avoid_barrier":         "ingredient that disrupts skin barrier",
    "skin_dry":              "dry skin profile",
    "skin_oily":             "oily skin profile",
    "skin_combination":      "combination skin profile",
    "skin_normal":           "normal skin profile",
}

def build_llm_prompt(product_name, base_score, personal_score, skin_type,
                     has_acne, top_factors, language="tr") -> str:
    labels = FEATURE_LABELS_TR if language == "tr" else FEATURE_LABELS_EN

    factor_lines = []
    for f in top_factors[:5]:
        label = labels.get(f["feature"], f["feature"])
        sign = "+" if f["effect"] > 0 else ""
        factor_lines.append(f"  - {label}: {sign}{f['effect']:.2f}")
    factors_text = "\n".join(factor_lines)

    acne_note = "ve sivilceye meyilli" if has_acne else ""

    if language == "tr":
        return (
            f"Sen bir dermatoloji asistanısın. "
            f"Kullanıcının cildi {skin_type} {acne_note}. "
            f"'{product_name}' ürününün genel kalite puanı {base_score:.1f}/10, "
            f"bu kullanıcıya özel puan ise {personal_score:.1f}/10.\n"
            f"Puanı etkileyen başlıca faktörler:\n{factors_text}\n\n"
            f"Bu bilgiyi kullanıcıya nazik, anlaşılır ve dermatolojik bir dille açıkla. "
            f"Maksimum 3 cümle. Teknik terimler kullanma, sade Türkçe kullan."
        )
    else:
        return (
            f"You are a dermatology assistant. "
            f"The user has {skin_type} skin{' with acne tendency' if has_acne else ''}. "
            f"The product '{product_name}' has a general quality score of {base_score:.1f}/10, "
            f"and a personalized score of {personal_score:.1f}/10 for this user.\n"
            f"Key factors affecting the score:\n{factors_text}\n\n"
            f"Explain this to the user in a friendly, clear, dermatological tone. "
            f"Maximum 3 sentences. Use plain language, avoid technical jargon."
        )


def call_llm(prompt: str, cache_key: str) -> str:
    """OpenAI API çağrısı. Cache'de varsa tekrar çağırmaz."""
    if cache_key in _explain_cache:
        return _explain_cache[cache_key]

    if not llm_client:
        return "LLM aciklamasi kullanilamıyor. .env dosyasini kontrol edin."

    try:
        response = llm_client.chat.completions.create(
            model=llm_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7,
        )
        text = response.choices[0].message.content.strip()
        # Cache boyutunu sınırla: en eski girdiyi sil
        if len(_explain_cache) >= _CACHE_MAX_SIZE:
            oldest_key = next(iter(_explain_cache))
            del _explain_cache[oldest_key]
        _explain_cache[cache_key] = text
        return text
    except Exception as e:
        return f"LLM hatası: {str(e)}"


# ─────────────────────────────────────────────
# ENDPOINT 3 — POST /explain
# ─────────────────────────────────────────────

@app.post("/explain")
def explain(req: ExplainRequest):
    """
    Puanın neden o değerde olduğunu SHAP ile hesaplar,
    OpenAI ile kullanıcıya doğal dilde açıklar.

    - language: 'tr' (Türkçe) veya 'en' (İngilizce)
    - Aynı ürün + cilt tipi kombinasyonu için cache'den döner
    """
    product = get_product_row(req.sephora_product_id)
    x = build_scoring_input(product, req.user)

    personal_score = float(np.clip(xgb_model.predict(x)[0], 1, 10))
    base_score = float(product.get("base_score", personal_score))

    # SHAP değerleri
    shap_values = shap_explainer(x)
    effects = shap_values.values[0]

    factors = []
    for feat, effect in zip(SCORING_FEATURES, effects):
        if abs(effect) > 0.01:
            factors.append({
                "feature": feat,
                "effect": round(float(effect), 3),
                "direction": "ARTIRAN" if effect > 0 else "DUSUREN",
            })
    factors.sort(key=lambda f: abs(f["effect"]), reverse=True)

    # LLM prompt + cache key
    lang = req.language if req.language in ("tr", "en") else "tr"
    cache_key = hashlib.md5(
        f"{req.sephora_product_id}_{req.user.skin_type}_{req.user.has_acne}_{lang}".encode()
    ).hexdigest()

    was_cached = cache_key in _explain_cache  # cache'e YAZMAdan önce kontrol et

    prompt = build_llm_prompt(
        product_name=product["product_name"],
        base_score=base_score,
        personal_score=personal_score,
        skin_type=req.user.skin_type,
        has_acne=req.user.has_acne,
        top_factors=factors,
        language=lang,
    )

    explanation = call_llm(prompt, cache_key)

    return {
        "product_id": req.sephora_product_id,
        "product_name": product["product_name"],
        "base_score": round(base_score, 1),
        "personal_score": round(personal_score, 1),
        "language": lang,
        "shap_factors": factors[:10],
        "explanation": explanation,
        "cached": was_cached,
    }

# ─────────────────────────────────────────────
# SAĞLIK KONTROLÜ
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": CONFIG["best_model"],
        "version": CONFIG["version"],
        "total_products": CONFIG["total_products"],
        "xgb_r2": CONFIG["xgb_metrics"]["r2"],
    }
