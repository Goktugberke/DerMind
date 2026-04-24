# DerMind AI Server

Yapay zeka destekli kişiselleştirilmiş kozmetik öneri ve puanlama sistemi.  
**FastAPI · XGBoost · KNN · SHAP · Ollama / OpenAI**

---

## İçindekiler

1. [Mimari](#mimari)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Kurulum (Lokal)](#kurulum-lokal)
4. [Kurulum (Docker Compose)](#kurulum-docker-compose)
5. [API Endpointleri](#api-endpointleri)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Model Performansı](#model-performansı)
8. [Temel Kavramlar](#temel-kavramlar)
9. [Dosya Yapısı](#dosya-yapısı)

---

## Mimari

```
Mobil / Frontend
      │
      ▼
Spring Boot Backend (:8080)
      │  POST /api/ai/score
      │  GET  /api/ai/recommend
      │  GET  /api/ai/explain/{id}
      │  GET  /api/ai/health
      ▼
FastAPI AI Server (:8000)            PostgreSQL (:5432)
  ├── /score    → XGBoost                 ▲
  ├── /recommend → KNN                    │
  ├── /explain  → SHAP + LLM       Spring Boot JPA
  └── /health   → sağlık               (ürünler, kullanıcılar)
```

**Veri akışı:**
1. Kullanıcı mobil uygulamada bir ürüne tıklar.
2. Mobil → Spring Boot `GET /api/ai/score/{productId}` çağırır.
3. Spring Boot, `Product.sephoraProductId` ile AI sunucusuna `POST /score` atar.
4. AI sunucusu XGBoost ile `base_score` ve `personal_score` üretir, döner.
5. Spring Boot sonucu mobil uygulamaya iletir.

---

## Hızlı Başlangıç

### Docker Compose ile (önerilen)

```bash
# Proje kökünden
cd backend
cp .env.example .env          # POSTGRES_USER, POSTGRES_PASSWORD doldur
cd ../ai-server
cp .env.example .env          # LLM ayarlarını doldur (varsayılan Ollama'dır)

# Tüm sistemi tek komutla başlat (postgres + ai-server + backend + frontend)
cd ../backend
docker compose up --build
```

Servisler sırasıyla şu adreslerde çalışır:

| Servis | URL |
|--------|-----|
| AI Server | http://localhost:8000 |
| AI Swagger UI | http://localhost:8000/docs |
| Spring Boot Backend | http://localhost:8080 |
| Frontend | http://localhost:80 |
| PostgreSQL | localhost:5432 |

---

## Kurulum (Lokal)

### Gereksinimler

- Python 3.11+
- `models/` klasöründe eğitilmiş model dosyaları (`xgboost_scoring_model.json`, `model_config.json` zorunlu)

### 1. Python Ortamı

```bash
cd ai-server
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Ortam Değişkenleri

```bash
cp .env.example .env
# .env dosyasını düzenle — varsayılan ayarlar Ollama için hazır
```

### 3. LLM Kurulumu (Ollama — Ücretsiz, Varsayılan)

```bash
# Ollama yüklüyse modeli çek (tek seferlik ~4 GB)
ollama pull llama3.1

# Çalıştığını doğrula
curl http://localhost:11434
# → "Ollama is running"
```

OpenAI kullanmak istersen `.env` dosyasında:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### 4. Model Eğitimi (isteğe bağlı — `models/` klasörü zaten doluysa atlayabilirsin)

```bash
# models/ klasörü boşsa eğitimi çalıştır (~3-5 dakika)
python train_models_v2.py --data-dir . --models-dir models
```

Eğitim sonucunda `models/` klasöründe şu dosyalar oluşur:
- `xgboost_scoring_model.json`
- `random_forest_scoring_model.pkl`
- `knn_recommender_model.pkl`
- `shap_explainer.pkl`
- `feature_scaler.pkl`
- `model_config.json`

### 5. Ürünleri Veritabanına Aktar (ilk kurulumda bir kez)

```bash
# Spring Boot backend çalışıyorken:
python seed_products.py

# Önce dry-run ile kontrol et:
python seed_products.py --dry-run

# JWT token gerekiyorsa:
python seed_products.py --token "Bearer eyJhb..."
```

### 6. Sunucuyu Başlat

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Sunucu hazır olduğunda:
```
INFO:     Application startup complete.
─── Tüm modeller hazır. ───
```

---

## Kurulum (Docker Compose)

AI sunucusu tek başına da Docker ile çalıştırılabilir:

```bash
cd ai-server

# .env dosyasını oluştur
cp .env.example .env

# İmajı derle ve çalıştır
docker build -t dermind-ai .
docker run -p 8000:8000 --env-file .env dermind-ai
```

Tüm sistem için `backend/compose.yaml` kullanılması önerilir — bkz. [Hızlı Başlangıç](#hızlı-başlangıç).

---

## API Endpointleri

Sunucu: `http://localhost:8000`  
Swagger UI: `http://localhost:8000/docs`

---

### GET /health

Sunucu ve model sağlık kontrolü. Auth gerektirmez.

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "ok",
  "model": "xgboost",
  "version": "2.1",
  "total_products": 4692,
  "xgb_r2": 0.853
}
```

---

### GET /metrics

Uptime, cache istatistikleri, endpoint istek sayaçları.

```bash
curl http://localhost:8000/metrics
```

---

### POST /score

Bir ürün için `base_score` (kullanıcıdan bağımsız) ve `personal_score` (kullanıcıya özel) döner.

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P476416",
    "user": {
      "skin_type": "oily",
      "has_acne": true,
      "allergies": ["paraben"]
    }
  }'
```

```json
{
  "product_id": "P476416",
  "product_name": "AFRICAN Beauty Butter",
  "brand": "54 Thrones",
  "base_score": 5.4,
  "personal_score": 4.1,
  "skin_type": "oily"
}
```

`skin_type` geçerli değerler: `dry | oily | combination | normal`

---

### POST /score/batch

Birden fazla ürünü aynı anda puan. Maks 50 ürün.

```bash
curl -X POST http://localhost:8000/score/batch \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_ids": ["P476416", "P123456", "P999001"],
    "user": { "skin_type": "dry", "has_acne": false, "allergies": [] }
  }'
```

---

### POST /recommend

Kullanıcı profiline göre KNN ile en uygun ürünleri önerir.

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user": { "skin_type": "dry", "has_acne": false, "allergies": [] },
    "category": "Skincare",
    "secondary_category": "Moisturizers",
    "top_k": 5
  }'
```

```json
{
  "user_skin_type": "dry",
  "category_filter": "Moisturizers",
  "recommendations": [
    {
      "product_id": "P123456",
      "product_name": "Barrier Moisture Cream",
      "brand": "COSRX",
      "category": "Moisturizers",
      "base_score": 8.2,
      "similarity": 0.943,
      "rating": 4.6,
      "price_usd": 38.0
    }
  ]
}
```

`category` ve `secondary_category` opsiyoneldir — verilmezse tüm kategorilerden öneri gelir.

---

### POST /explain

SHAP ile puana etki eden faktörleri hesaplar, **Ollama (varsayılan) veya OpenAI** ile kullanıcıya doğal dilde açıklar.

> İlk çağrıda LLM yanıt süresi 5–30 saniyedir. Aynı kombinasyon için ikinci çağrı anında döner (TTL cache).

```bash
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P476416",
    "user": { "skin_type": "oily", "has_acne": true, "allergies": [] },
    "language": "tr"
  }'
```

```json
{
  "product_id": "P476416",
  "product_name": "AFRICAN Beauty Butter",
  "base_score": 5.4,
  "personal_score": 4.1,
  "language": "tr",
  "shap_factors": [
    { "feature": "is_recommended", "effect": 1.32,  "direction": "ARTIRAN" },
    { "feature": "penalty_score",  "effect": -0.51, "direction": "DÜŞÜREN" },
    { "feature": "good_for_oily",  "effect": 0.43,  "direction": "ARTIRAN" }
  ],
  "explanation": "Bu ürün genel olarak kaliteli olsa da içindeki bazı kısıtlı maddeler yağlı cildinizde tahriş yapabilir.",
  "cached": false
}
```

`language`: `tr` (Türkçe, varsayılan) | `en` (İngilizce)

**Cache:** `product_id + skin_type + has_acne + language` kombinasyonu için LLM tekrar çağrılmaz (1 saatlik TTL).

---

## Ortam Değişkenleri

`.env.example` dosyasından kopyala:

```bash
cp .env.example .env
```

| Değişken | Varsayılan | Açıklama |
|----------|-----------|---------|
| `LLM_PROVIDER` | `ollama` | `ollama` veya `openai` |
| `OLLAMA_HOST` | `http://localhost:11434` | Docker içinde `http://host.docker.internal:11434` yap |
| `OLLAMA_MODEL` | `llama3.1` | Çekilen model adı |
| `OPENAI_API_KEY` | — | `LLM_PROVIDER=openai` ise zorunlu |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model adı |
| `INTERNAL_API_KEY` | — | Boş bırakılırsa auth devre dışı |
| `ALLOWED_ORIGINS` | `*` | Production'da backend URL'ini yaz |
| `EXPLAIN_CACHE_TTL` | `3600` | Saniye cinsinden cache süresi |
| `EXPLAIN_CACHE_MAX` | `500` | Maksimum cache girdisi |

---

## Model Performansı

### XGBoost Regresyon Metrikleri (Test: 193K satır)

| Metrik | Değer |
|--------|-------|
| MAE | **0.3912** (10 üzerinden ortalama 0.39 puan hata) |
| RMSE | **0.5194** |
| R² | **0.8530** (varyansın %85'ini açıklıyor) |
| 5-Fold CV R² | **0.8386 ± 0.017** (overfitting yok) |
| 1 puan içinde | **%94.9** |
| 0.5 puan içinde | **%72.5** |

### En Etkili Özellikler (SHAP)

| # | Özellik | Ortalama Etki |
|---|---------|---------------|
| 1 | is_recommended | 1.3240 |
| 2 | base_score | 0.7798 |
| 3 | penalty_score | 0.2988 |
| 4 | banned_count | 0.1898 |
| 5 | good_for_acne | 0.1190 |

---

## Temel Kavramlar

### Base Score ve Personal Score

**Base score** kullanıcıdan bağımsız ürün kalite puanı (1–10):

```
base_score = (sephora_rating / 5) × 10 × 0.6   → Rating bileşeni (%60 ağırlık)
           + min(faydali_madde / 10, 1) × 2      → Faydalı ingredient bonusu
           - min(kacinilacak / 5, 1) × 1          → Kaçınılacak madde cezası
           - min(penalty_score / 10, 1) × 2        → CosIng yasaklı madde cezası
```

**Personal score**, XGBoost'un kullanıcı profiliyle (cilt tipi, alerji, geçmiş) ürettiği kişisel puan. Base score üzerine ±2 puana kadar kayabilir.

### KNN Öneri Sistemi

4.692 ürün 24 özellik ile vektörize edilmiştir (cilt tipi uyumluluğu, ingredient kategorileri, kalite metrikleri). Cosine similarity ile en yakın K ürün döner.

### SHAP + LLM (Explainable AI)

SHAP, her özelliğin son puana kaç puan kattığını sayısal olarak hesaplar. Bu değerler LLM'e gönderilerek kullanıcıya Türkçe/İngilizce doğal dil açıklaması üretilir.

---

## Dosya Yapısı

```
ai-server/
├── app.py                           ← FastAPI sunucusu (score, recommend, explain)
├── train_models_v2.py               ← Model eğitim pipeline (XGBoost, KNN, SHAP)
├── seed_products.py                 ← CSV ürünlerini Spring Boot backend'ine aktar
├── .env.example                     ← Ortam değişkenleri şablonu
├── .env                             ← Kendi ayarların (git'e commit etme)
├── requirements.txt                 ← Python bağımlılıkları
├── Dockerfile                       ← Docker imajı
├── pytest.ini                       ← Test ayarları
├── TODO.md                          ← Yapılacaklar ve bilinen sorunlar
├── dermind_knn_product_vectors.csv  ← 4,692 ürün vektörü (KNN için)
├── dermind_ai_training_dataset.csv  ← 966K satır eğitim verisi
├── tests/
│   └── test_app.py                  ← 28 test (22 birim + 6 LLM)
└── models/
    ├── xgboost_scoring_model.json   ← Ana model (R²=0.853) — train_models_v2.py ile üret
    ├── random_forest_scoring_model.pkl ← Baseline model
    ├── knn_recommender_model.pkl    ← KNN öneri modeli
    ├── shap_explainer.pkl           ← SHAP açıklayıcı
    ├── feature_scaler.pkl           ← KNN normalizasyon
    └── model_config.json            ← Metrikler + feature listesi (ZORUNLU)
```

> `models/xgboost_scoring_model.json` ve `models/model_config.json` olmadan sunucu başlamaz.  
> Üretmek için: `python train_models_v2.py --data-dir . --models-dir models`

---

## Testler

```bash
# LLM gerektirmeyen 22 test (CI/CD için)
pytest tests/ -m "not llm" -v

# Tüm testler (Ollama çalışıyor olmalı)
pytest tests/ -v

# Coverage raporu
pytest tests/ -m "not llm" --cov=app --cov-report=term-missing
```
