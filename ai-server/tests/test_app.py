"""
DerMind AI Server — Pytest Test Suite
======================================
Çalıştırma:
  cd ai-server
  pytest tests/ -v

  # Sadece hızlı testler (LLM gerektirmeyenler):
  pytest tests/ -v -m "not llm"

  # Coverage raporu:
  pytest tests/ -v --cov=app --cov-report=term-missing
"""

import sys
import os
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


@asynccontextmanager
async def _noop_lifespan(app):
    """Testlerde model dosyası gerektirmeyen boş lifespan."""
    yield

# ─────────────────────────────────────────────
# TEST VERİSİ  —  gerçek model dosyaları gerekmez
# ─────────────────────────────────────────────

MOCK_PRODUCT_ID   = "P000001"
MOCK_PRODUCT_NAME = "Test Moisturizer"
MOCK_BRAND        = "TestBrand"
MOCK_BASE_SCORE   = 7.2

# Tam feature seti (app.py SCORING_FEATURES ile örtüşmeli)
_SCORING_FEATURES = [
    "skin_dry", "skin_oily", "skin_combination", "skin_normal",
    "rating", "is_recommended",
    "ingredient_count",
    "banned_count", "restricted_count", "penalty_score",
    "base_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv", "good_for_barrier",
    "good_for_radiance", "good_for_texture", "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
]
_KNN_FEATURES = [
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    "base_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv", "good_for_barrier",
    "good_for_radiance", "good_for_texture", "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
    "rating", "price_usd",
]


def _make_product_df(n: int = 5) -> pd.DataFrame:
    rows = []
    for i in range(n):
        row = {
            "product_id":         f"P00000{i+1}",
            "product_name":       f"Test Product {i+1}",
            "brand_name":         "TestBrand",
            "rating":             4.0 + i * 0.1,
            "price_usd":          25.0 + i * 5,
            "primary_category":   "Skincare",
            "secondary_category": "Moisturizers",
        }
        for feat in _SCORING_FEATURES + _KNN_FEATURES:
            if feat not in row:
                row[feat] = float(i % 3)
        row["base_score"] = 6.0 + i * 0.2   # 1-10 aralığında sabit değer
        rows.append(row)
    return pd.DataFrame(rows)


def _make_config() -> dict:
    return {
        "best_model":        "xgboost",
        "version":           "2.0",
        "total_products":    5,
        "scoring_features":  _SCORING_FEATURES,
        "knn_features":      _KNN_FEATURES,
        "xgb_best_iteration": 500,
        "xgb_metrics":       {"r2": 0.999, "mae": 0.01, "rmse": 0.02},
    }


# ─────────────────────────────────────────────
# FIXTURE  —  mock'lu TestClient
# ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """
    Gerçek model dosyaları yokken mock'larla çalışan TestClient.
    Lifespan atlanır; globaller doğrudan patch edilir.
    """
    mock_df  = _make_product_df(5)
    mock_cfg = _make_config()

    # XGBoost mock: her zaman 7.5 döner
    mock_xgb = MagicMock()
    mock_xgb.predict.return_value = np.array([7.5], dtype=np.float32)

    # SHAP mock: sıfır etkiler (feature sayısı kadar)
    n_feat = len(_SCORING_FEATURES)
    mock_shap_result      = MagicMock()
    mock_shap_result.values = np.zeros((1, n_feat), dtype=np.float64)
    mock_shap_result.values[0][0] = 0.5    # skin_dry etkisi
    mock_shap_result.values[0][1] = -0.3   # skin_oily etkisi
    mock_shap_explainer = MagicMock(return_value=mock_shap_result)

    # Scaler mock: giriş = çıkış (identity)
    mock_scaler = MagicMock()
    mock_scaler.transform.side_effect = lambda x: (
        x.values if hasattr(x, "values") else x
    )

    # LLM mock
    mock_llm_response          = MagicMock()
    mock_llm_response.choices[0].message.content = "Bu ürün cildiniz için uygundur."
    mock_llm_client            = MagicMock()
    mock_llm_client.chat.completions.create.return_value = mock_llm_response

    import app as ai_app

    # KNN mock: her zaman ilk 3 ürünü döndür
    mock_knn = MagicMock()
    mock_knn.kneighbors.return_value = (
        np.array([[0.1, 0.2, 0.3]]),
        np.array([[0, 1, 2]]),
    )

    with (
        patch.object(ai_app, "CONFIG",           mock_cfg),
        patch.object(ai_app, "SCORING_FEATURES", _SCORING_FEATURES),
        patch.object(ai_app, "KNN_FEATURES",     _KNN_FEATURES),
        patch.object(ai_app, "xgb_model",        mock_xgb),
        patch.object(ai_app, "shap_explainer",   mock_shap_explainer),
        patch.object(ai_app, "scaler",            mock_scaler),
        patch.object(ai_app, "knn_model",         mock_knn),
        patch.object(ai_app, "product_df",        mock_df),
        patch.object(ai_app, "_product_index",    {f"P00000{i+1}": i for i in range(5)}),
        patch.object(ai_app, "_dataset_medians",  {"ingredient_count": 20.0, "rating": 4.5, "price_usd": 35.0}),
        patch.object(ai_app, "llm_client",        mock_llm_client),
        patch.object(ai_app, "_startup_time",     0.0),
    ):
        # lifespan'ı no-op ile değiştir — modeller zaten patch edildi
        ai_app.app.router.lifespan_context = _noop_lifespan
        with TestClient(ai_app.app, raise_server_exceptions=True) as c:
            yield c


# ─────────────────────────────────────────────
# TEST — GET /health
# ─────────────────────────────────────────────

class TestHealth:
    def test_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "model" in body
        assert "total_products" in body
        assert "xgb_r2" in body

    def test_response_time_header(self, client):
        r = client.get("/health")
        assert "x-response-time" in r.headers


# ─────────────────────────────────────────────
# TEST — GET /metrics
# ─────────────────────────────────────────────

class TestMetrics:
    def test_structure(self, client):
        r = client.get("/metrics")
        assert r.status_code == 200
        body = r.json()
        assert "uptime_seconds" in body
        assert "cache" in body
        assert "request_counts" in body
        assert "model" in body

    def test_cache_fields(self, client):
        body = client.get("/metrics").json()
        cache = body["cache"]
        for key in ("size", "maxsize", "ttl_seconds", "hits", "misses", "hit_rate_pct"):
            assert key in cache, f"cache.{key} eksik"


# ─────────────────────────────────────────────
# TEST — POST /score
# ─────────────────────────────────────────────

class TestScore:
    BASE_PAYLOAD = {
        "sephora_product_id": MOCK_PRODUCT_ID,
        "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
    }

    def test_happy_path(self, client):
        r = client.post("/score", json=self.BASE_PAYLOAD)
        assert r.status_code == 200
        body = r.json()
        assert body["product_id"] == MOCK_PRODUCT_ID
        assert 1.0 <= body["personal_score"] <= 10.0
        assert 1.0 <= body["base_score"]     <= 10.0
        assert body["skin_type"] == "dry"

    def test_all_skin_types(self, client):
        for skin in ("dry", "oily", "combination", "normal"):
            payload = {**self.BASE_PAYLOAD, "user": {**self.BASE_PAYLOAD["user"], "skin_type": skin}}
            r = client.post("/score", json=payload)
            assert r.status_code == 200, f"skin_type={skin} için hata: {r.text}"

    def test_with_allergies(self, client):
        payload = {**self.BASE_PAYLOAD, "user": {
            "skin_type": "oily", "has_acne": True, "allergies": ["paraben", "alcohol"],
        }}
        r = client.post("/score", json=payload)
        assert r.status_code == 200

    def test_with_is_recommended(self, client):
        payload = {**self.BASE_PAYLOAD, "is_recommended": 0.9}
        r = client.post("/score", json=payload)
        assert r.status_code == 200

    def test_invalid_product_id_returns_404(self, client):
        payload = {**self.BASE_PAYLOAD, "sephora_product_id": "INVALID_ID"}
        r = client.post("/score", json=payload)
        assert r.status_code == 404

    def test_invalid_skin_type_returns_422(self, client):
        payload = {**self.BASE_PAYLOAD, "user": {
            "skin_type": "sensitive", "has_acne": False, "allergies": [],
        }}
        r = client.post("/score", json=payload)
        assert r.status_code == 422

    def test_too_many_allergies_returns_422(self, client):
        payload = {**self.BASE_PAYLOAD, "user": {
            "skin_type": "normal",
            "has_acne": False,
            "allergies": [f"allergen_{i}" for i in range(25)],   # MAX_ALLERGIES=20
        }}
        r = client.post("/score", json=payload)
        assert r.status_code == 422

    def test_is_recommended_out_of_range_returns_422(self, client):
        r = client.post("/score", json={**self.BASE_PAYLOAD, "is_recommended": 1.5})
        assert r.status_code == 422


# ─────────────────────────────────────────────
# TEST — POST /score/batch
# ─────────────────────────────────────────────

class TestScoreBatch:
    USER = {"skin_type": "dry", "has_acne": False, "allergies": []}

    def test_happy_path(self, client):
        r = client.post("/score/batch", json={
            "sephora_product_ids": ["P000001", "P000002", "P000003"],
            "user": self.USER,
        })
        assert r.status_code == 200
        body = r.json()
        assert len(body["results"]) == 3
        assert len(body["errors"])  == 0

    def test_partial_errors(self, client):
        r = client.post("/score/batch", json={
            "sephora_product_ids": ["P000001", "INVALID"],
            "user": self.USER,
        })
        assert r.status_code == 200
        body = r.json()
        assert len(body["results"]) == 1
        assert len(body["errors"])  == 1
        assert body["errors"][0]["product_id"] == "INVALID"

    def test_empty_list_returns_422(self, client):
        r = client.post("/score/batch", json={"sephora_product_ids": [], "user": self.USER})
        assert r.status_code == 422

    def test_too_many_ids_returns_422(self, client):
        ids = [f"P{i:06d}" for i in range(51)]   # MAX_BATCH_SIZE=50
        r   = client.post("/score/batch", json={"sephora_product_ids": ids, "user": self.USER})
        assert r.status_code == 422


# ─────────────────────────────────────────────
# TEST — POST /recommend
# ─────────────────────────────────────────────

class TestRecommend:
    BASE = {
        "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
        "top_k": 3,
    }

    def test_happy_path(self, client):
        r = client.post("/recommend", json=self.BASE)
        assert r.status_code == 200
        body = r.json()
        assert "recommendations" in body
        assert len(body["recommendations"]) <= 3
        assert body["user_skin_type"] == "dry"

    def test_category_filter(self, client):
        payload = {**self.BASE, "secondary_category": "Moisturizers"}
        r = client.post("/recommend", json=payload)
        assert r.status_code == 200

    def test_invalid_category_returns_404(self, client):
        payload = {**self.BASE, "secondary_category": "NonExistentCategory9999"}
        r = client.post("/recommend", json=payload)
        assert r.status_code == 404

    def test_recommendation_fields(self, client):
        r = client.post("/recommend", json=self.BASE)
        for rec in r.json()["recommendations"]:
            for field in ("product_id", "product_name", "brand", "base_score", "similarity"):
                assert field in rec, f"'{field}' alanı eksik"
            assert 0.0 <= rec["similarity"] <= 1.0, "similarity 0-1 aralığında olmalı"

    def test_top_k_limit(self, client):
        payload = {**self.BASE, "top_k": 2}
        r = client.post("/recommend", json=payload)
        assert len(r.json()["recommendations"]) <= 2

    def test_top_k_out_of_range_returns_422(self, client):
        r = client.post("/recommend", json={**self.BASE, "top_k": 25})
        assert r.status_code == 422


# ─────────────────────────────────────────────
# TEST — POST /explain
# ─────────────────────────────────────────────

class TestExplain:
    BASE = {
        "sephora_product_id": MOCK_PRODUCT_ID,
        "user": {"skin_type": "oily", "has_acne": True, "allergies": []},
        "language": "tr",
    }

    @pytest.mark.llm
    def test_turkish_explanation(self, client):
        r = client.post("/explain", json=self.BASE)
        assert r.status_code == 200
        body = r.json()
        assert body["language"] == "tr"
        assert isinstance(body["explanation"], str)
        assert len(body["explanation"]) > 0
        assert "shap_factors" in body

    @pytest.mark.llm
    def test_english_explanation(self, client):
        payload = {**self.BASE, "language": "en"}
        r = client.post("/explain", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["language"] == "en"
        # EN response'da direction İngilizce olmalı
        for factor in body["shap_factors"]:
            assert factor["direction"] in ("INCREASES", "DECREASES")

    @pytest.mark.llm
    def test_cache_behavior(self, client):
        # İlk çağrı — cache miss
        r1 = client.post("/explain", json=self.BASE)
        assert r1.status_code == 200

        # Aynı payload ile ikinci çağrı — cache hit
        r2 = client.post("/explain", json=self.BASE)
        assert r2.status_code == 200
        assert r2.json()["cached"] is True

    @pytest.mark.llm
    def test_different_allergies_different_cache(self, client):
        base_payload     = {**self.BASE, "user": {**self.BASE["user"], "allergies": []}}
        allergen_payload = {**self.BASE, "user": {**self.BASE["user"], "allergies": ["paraben"]}}

        r1 = client.post("/explain", json=base_payload)
        r2 = client.post("/explain", json=allergen_payload)
        assert r1.status_code == 200
        assert r2.status_code == 200
        # Farklı cache key'ler — en az biri cache miss olmalı
        # (İkisi aynı cached=True olamaz aynı anda ilk kez çağrıldıklarında)

    @pytest.mark.llm
    def test_invalid_product_returns_404(self, client):
        payload = {**self.BASE, "sephora_product_id": "BAD_ID"}
        r = client.post("/explain", json=payload)
        assert r.status_code == 404

    @pytest.mark.llm
    def test_shap_factors_structure(self, client):
        r = client.post("/explain", json=self.BASE)
        for factor in r.json()["shap_factors"]:
            assert "feature"   in factor
            assert "effect"    in factor
            assert "direction" in factor
            assert isinstance(factor["effect"], float)


# ─────────────────────────────────────────────
# BUSINESS INVARIANTS  —  model davranışı testleri
# ─────────────────────────────────────────────

class TestBusinessInvariants:
    """Mock'lar üzerinden iş kuralı testleri (deterministik input → beklenen output)."""

    def test_score_input_includes_skin_one_hot(self, client):
        """Yağlı cilt input'unda skin_oily=1, diğerleri 0 olmalı."""
        import app as ai_app
        ai_app.xgb_model.predict.reset_mock()

        client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "oily", "has_acne": False, "allergies": []},
        })

        # predict çağrıldığında ilk argüman (DataFrame) skin_oily=1, diğer skin_*=0 içermeli
        called_input = ai_app.xgb_model.predict.call_args[0][0]
        assert called_input["skin_oily"].iloc[0] == 1
        assert called_input["skin_dry"].iloc[0] == 0
        assert called_input["skin_combination"].iloc[0] == 0
        assert called_input["skin_normal"].iloc[0] == 0

    def test_allergies_increase_penalty_score(self, client):
        """Alerjisi olan kullanıcının input'unda penalty_score artmış olmalı."""
        import app as ai_app
        ai_app.xgb_model.predict.reset_mock()

        # Alerjisiz baseline
        client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
        })
        no_allergy_input = ai_app.xgb_model.predict.call_args[0][0]
        baseline_penalty = float(no_allergy_input["penalty_score"].iloc[0])

        # 3 alerjili
        client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "dry", "has_acne": False, "allergies": ["a", "b", "c"]},
        })
        allergy_input = ai_app.xgb_model.predict.call_args[0][0]
        with_penalty = float(allergy_input["penalty_score"].iloc[0])

        # Her alerji +3 penalty ekliyor
        assert with_penalty >= baseline_penalty + 3 * 3

    def test_allergies_increase_banned_count(self, client):
        """Alerjisi olan kullanıcının input'unda banned_count artmış olmalı."""
        import app as ai_app
        ai_app.xgb_model.predict.reset_mock()

        client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "dry", "has_acne": False, "allergies": ["paraben", "sls"]},
        })
        called_input = ai_app.xgb_model.predict.call_args[0][0]
        assert float(called_input["banned_count"].iloc[0]) >= 2

    def test_is_recommended_passed_to_model(self, client):
        """Backend'den gelen is_recommended değeri input'a yansımalı."""
        import app as ai_app
        ai_app.xgb_model.predict.reset_mock()

        client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "normal", "has_acne": False, "allergies": []},
            "is_recommended": 0.85,
        })
        called_input = ai_app.xgb_model.predict.call_args[0][0]
        assert abs(float(called_input["is_recommended"].iloc[0]) - 0.85) < 1e-6

    def test_is_recommended_default_neutral(self, client):
        """is_recommended verilmezse 0.5 (nötr) kullanılmalı."""
        import app as ai_app
        ai_app.xgb_model.predict.reset_mock()

        client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "normal", "has_acne": False, "allergies": []},
        })
        called_input = ai_app.xgb_model.predict.call_args[0][0]
        assert abs(float(called_input["is_recommended"].iloc[0]) - 0.5) < 1e-6

    def test_personal_score_clipped_to_valid_range(self, client):
        """personal_score her zaman [1, 10] aralığında olmalı."""
        r = client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
        })
        assert r.status_code == 200
        body = r.json()
        assert 1.0 <= body["personal_score"] <= 10.0

    def test_recommend_uses_pretrained_knn_when_no_filter(self, client):
        """Kategori/alerji filtresi yoksa pre-fitted knn_model kullanılmalı (refit yok)."""
        import app as ai_app
        ai_app.knn_model.kneighbors.reset_mock()

        r = client.post("/recommend", json={
            "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
            "top_k": 3,
        })
        assert r.status_code == 200
        # Pre-fitted model çağrılmış olmalı
        assert ai_app.knn_model.kneighbors.called

    def test_recommend_dry_skin_prefers_dry_features(self, client):
        """Kuru cilt user_vector'unda good_for_dry > 0 olmalı."""
        import app as ai_app
        ai_app.scaler.transform.reset_mock()

        client.post("/recommend", json={
            "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
            "top_k": 3,
        })
        # scaler.transform en az iki kez çağrıldı; user_vector son çağrıda
        # En son çağrı user vektörü olur (KNN data'dan sonra) — ama no-filter durumunda
        # sadece user_scaled için bir çağrı var. Her durumda user_vector good_for_dry içermeli.
        all_calls = ai_app.scaler.transform.call_args_list
        # User vector tek satırlı DataFrame olarak gelir
        user_calls = [c for c in all_calls if hasattr(c[0][0], "shape") and c[0][0].shape[0] == 1]
        assert len(user_calls) > 0
        user_df = user_calls[0][0][0]
        assert user_df["good_for_dry"].iloc[0] > 0

    def test_recommend_acne_user_prefers_acne_features(self, client):
        """has_acne=True user_vector'da good_for_acne > 0 olmalı."""
        import app as ai_app
        ai_app.scaler.transform.reset_mock()

        client.post("/recommend", json={
            "user": {"skin_type": "oily", "has_acne": True, "allergies": []},
            "top_k": 3,
        })
        all_calls = ai_app.scaler.transform.call_args_list
        user_calls = [c for c in all_calls if hasattr(c[0][0], "shape") and c[0][0].shape[0] == 1]
        assert len(user_calls) > 0
        user_df = user_calls[0][0][0]
        assert user_df["good_for_acne"].iloc[0] > 0

    def test_llm_error_not_cached(self, client):
        """LLM hatası cache'lenmemeli — ikinci çağrıda yeniden denemeli."""
        import app as ai_app
        ai_app.llm_client.chat.completions.create.side_effect = RuntimeError("LLM down")
        # Cache temizliği
        ai_app._explain_cache.clear()

        payload = {
            "sephora_product_id": "P000001",
            "user": {"skin_type": "dry", "has_acne": False, "allergies": []},
            "language": "tr",
        }
        r1 = client.post("/explain", json=payload)
        r2 = client.post("/explain", json=payload)

        # Mock side_effect'i geri al
        ai_app.llm_client.chat.completions.create.side_effect = None

        # Her iki çağrıda llm_error=True ve cached=False olmalı
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["llm_error"] is True
        assert r2.json()["llm_error"] is True
        assert r2.json()["cached"] is False

    def test_metrics_tracks_llm_errors(self, client):
        """Metrics endpoint LLM hata sayacı içermeli."""
        body = client.get("/metrics").json()
        assert "llm" in body
        assert "errors" in body["llm"]
        assert "calls" in body["llm"]
        assert "error_rate_pct" in body["llm"]


# ─────────────────────────────────────────────
# COLD-START SENARYOLARI  —  yeni kullanıcı, hiç rating yok
# ─────────────────────────────────────────────

class TestColdStart:
    """
    Cold-start: kullanıcı sisteme yeni katılmış, hiç UserProductRating yok.
    Backend `is_recommended=null` gönderir → AI server 0.5 (nötr) kullanmalı,
    ama puanlama yine çalışmalı (model eğitiminde 0.5 ile pretrain edildi).
    """

    BASE_USER = {"skin_type": "normal", "has_acne": False, "allergies": []}

    def test_score_without_is_recommended(self, client):
        """is_recommended verilmezse 200 dönmeli ve geçerli puan üretmeli."""
        r = client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": self.BASE_USER,
        })
        assert r.status_code == 200
        body = r.json()
        assert 1.0 <= body["personal_score"] <= 10.0
        assert 1.0 <= body["base_score"] <= 10.0

    def test_score_with_explicit_null_is_recommended(self, client):
        """is_recommended=null açıkça gönderilirse de 200 dönmeli."""
        r = client.post("/score", json={
            "sephora_product_id": "P000001",
            "user": self.BASE_USER,
            "is_recommended": None,
        })
        assert r.status_code == 200

    def test_recommend_no_filters_no_history(self, client):
        """Cold-start kullanıcı için /recommend filtre olmadan çalışmalı (default top_k)."""
        r = client.post("/recommend", json={"user": self.BASE_USER})
        assert r.status_code == 200
        body = r.json()
        assert "recommendations" in body
        assert len(body["recommendations"]) > 0  # En az bir öneri dönmeli

    def test_recommend_uses_dataset_medians_for_unknown_user(self, client):
        """
        Cold-start user vector dataset median'larını kullanmalı (hardcoded sabit değil).
        Test: scaler.transform'a giden user vector'ün rating ve price_usd'si patch edilen
        median değerleriyle eşleşmeli.
        """
        import app as ai_app
        ai_app.scaler.transform.reset_mock()

        client.post("/recommend", json={"user": self.BASE_USER, "top_k": 3})

        all_calls = ai_app.scaler.transform.call_args_list
        user_calls = [c for c in all_calls if hasattr(c[0][0], "shape") and c[0][0].shape[0] == 1]
        assert len(user_calls) > 0
        user_df = user_calls[0][0][0]
        # _dataset_medians fixture'da {"ingredient_count": 20.0, "rating": 4.5, "price_usd": 35.0}
        assert abs(float(user_df["rating"].iloc[0]) - 4.5) < 1e-6
        assert abs(float(user_df["price_usd"].iloc[0]) - 35.0) < 1e-6

    def test_score_batch_cold_start(self, client):
        """Yeni kullanıcı birden fazla ürünü cold-start ile puanlayabilmeli."""
        r = client.post("/score/batch", json={
            "sephora_product_ids": ["P000001", "P000002", "P000003"],
            "user": self.BASE_USER,
        })
        assert r.status_code == 200
        body = r.json()
        assert len(body["results"]) == 3
        assert all(1.0 <= res["personal_score"] <= 10.0 for res in body["results"])

    def test_explain_cold_start_falls_back_gracefully(self, client):
        """LLM down + cold-start kullanıcısı için /explain crash etmemeli."""
        import app as ai_app
        ai_app.llm_client.chat.completions.create.side_effect = RuntimeError("down")
        ai_app._explain_cache.clear()

        r = client.post("/explain", json={
            "sephora_product_id": "P000001",
            "user": self.BASE_USER,
            "language": "tr",
        })
        ai_app.llm_client.chat.completions.create.side_effect = None

        assert r.status_code == 200
        body = r.json()
        # SHAP çalışmalı, sadece LLM açıklaması hata mesajı içersin
        assert "shap_factors" in body
        assert body["llm_error"] is True
        assert 1.0 <= body["personal_score"] <= 10.0
