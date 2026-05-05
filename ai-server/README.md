# DerMind AI Server

Yapay zeka destekli kişiselleştirilmiş kozmetik öneri ve puanlama sistemi.
**FastAPI · XGBoost · KNN · SHAP · Ollama / OpenAI · OpenTelemetry**

---

## İçindekiler

1. [Mimari](#mimari)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Kurulum (Lokal)](#kurulum-lokal)
4. [Kurulum (Docker Compose)](#kurulum-docker-compose)
5. [API Endpointleri](#api-endpointleri)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Rate Limiting](#rate-limiting)
8. [Distributed Tracing](#distributed-tracing-opentelemetry)
9. [Allergen Text Matching](#allergen-text-matching)
10. [Model Performansı](#model-performansı)
11. [Temel Kavramlar](#temel-kavramlar)
12. [Dosya Yapısı](#dosya-yapısı)
13. [Testler](#testler)

---

## Mimari

```
Mobil / Frontend
      │
      ▼
Spring Boot Backend (:8080)
      │  GET  /api/ai/score/{productId}
      │  GET  /api/ai/recommend
      │  GET  /api/ai/explain/{id}
      │  GET  /api/ai/health
      │  X-Internal-Key: <shared-secret>
      ▼
FastAPI AI Server (:8000)            PostgreSQL (:5432)
  ├── /score          → XGBoost            ▲
  ├── /score/batch    → XGBoost x N        │
  ├── /recommend      → KNN          Spring Boot JPA
  ├── /explain        → SHAP + LLM      (ürünler, kullanıcılar,
  ├── /explain/stream → SSE streaming    ratings, streaks)
  ├── /metrics        → cache & LLM stats
  └── /health         → sağlık + drift kontrolü
```

**Veri akışı:**
1. Kullanıcı mobil uygulamada bir ürüne tıklar.
2. Mobil → Spring Boot → AI server (`X-Internal-Key` header ile authenticate).
3. AI server: XGBoost ile `personal_score`, allergen text matching ile `allergen_warnings`.
4. Backend `UserProductRating.wouldRecommend` ortalamasını `is_recommended` olarak iletir → cold-start dışındaki kullanıcılarda model en güçlü feature'ı kullanır.
5. Sonuç mobil uygulamaya akar.

---

## Hızlı Başlangıç

### Docker Compose ile (önerilen)

```bash
cd backend
cp .env.example .env          # POSTGRES_USER, POSTGRES_PASSWORD doldur
cd ../ai-server
cp .env.example .env          # LLM ayarlarını doldur (varsayılan Ollama'dır)

cd ../backend
docker compose up --build
```

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
- `models/` klasöründe eğitilmiş model dosyaları (`xgboost_scoring_model.json`, `model_config.json`, `knn_recommender_model.pkl`, `shap_explainer.pkl`, `feature_scaler.pkl` zorunlu)
- `dermind_knn_product_vectors.csv` (4.692 ürün) — repo ile birlikte gelir

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
ollama pull llama3.1
curl http://localhost:11434
# → "Ollama is running"
```

OpenAI kullanmak istersen `.env` dosyasında:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### 4. Model Eğitimi (isteğe bağlı)

```bash
# Önce dataset'i üret (CosIng + Sephora + SkinCare merge, ingredients_text dahil)
python build_dataset_v2.py

# Modelleri eğit (~3-5 dakika)
python train_models_v2.py --data-dir . --models-dir models

# Hızlı test (RF ve CV atla)
python train_models_v2.py --skip-rf --skip-cv
```

> `train_models_v2.py` ve `app.py` artık ortak `features.py` modülünü import eder — feature listesi tek doğru kaynaktan gelir, eğitim ve inference uyumsuzluğu otomatik tespit edilir (drift WARN log).

### 5. Ürünleri Veritabanına Aktar (ilk kurulumda bir kez)

İki yol var. **Lokal geliştirme için doğrudan-DB önerilir** — backend ayağa kaldırmaya, admin Firebase token üretmeye gerek yok.

#### A) Doğrudan DB (önerilen, lokal/CI)

```bash
# PostgreSQL ayakta olmalı (backend/compose.yaml veya manuel docker run).
python seed_products_direct.py --truncate
# Farklı port ise:
python seed_products_direct.py --truncate \
    --db-url postgresql://postgres:postgres@localhost:5432/dermind
```

`--truncate` mevcut `products` satırlarını siler ve `cart_items / favorites / purchases / streaks / user_product_ratings` FK'leri CASCADE ile temizlenir. CSV → 4692 ürün → `INSERT ... ON CONFLICT (sephora_product_id) DO UPDATE` ile yazılır. Tipik süre: ~2 sn.

Beklenen log:
```
CSV yüklendi: 4,692 ürün
Yazılacak benzersiz satır: 4,692
TRUNCATE products CASCADE çalıştırılıyor...
TAMAMLANDI — 4,692 satır 1.7s'de yazıldı
```

#### B) Backend HTTP üzerinden (prod / remote DB)

`POST /api/products` `hasRole("ADMIN")` ister, geçerli admin Firebase token gerekir.

```bash
python seed_products.py                              # backend localhost:8080
python seed_products.py --dry-run                    # önizleme
python seed_products.py --backend-url http://host:8080 --token "Bearer eyJhb..."
```

### 6. Sunucuyu Başlat

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Beklenen başlangıç log'ları (sırayla):

```
INFO:     Started server process [...]
INFO:     Waiting for application startup.
[INFO] dermind-ai: ─── Startup: modeller yükleniyor... ───
[INFO] dermind-ai: Dataset medians: {'ingredient_count': 29.0, 'rating': 4.27, ...}
[INFO] dermind-ai: Allergen matching: ingredients_text kolonu mevcut (4,692 ürün)
[INFO] dermind-ai: XGBoost  : OK  (best_iter=999)
[INFO] dermind-ai: SHAP     : OK
[INFO] dermind-ai: KNN      : OK  (4,692 ürün, 24 özellik)
[INFO] dermind-ai: Index    : 4,692 ürün indekslendi
[INFO] dermind-ai: ─── Tüm modeller hazır. ───
[INFO] dermind-ai: LLM health: Ollama (llama3.1) @ http://localhost:11434 erişilebilir.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Bu satırları görüyorsan model ve LLM hazır. `Allergen matching: ingredients_text kolonu YOK` görünürse `python build_dataset_v2.py` ile CSV'yi yeniden üret.

---

## Kurulum (Docker Compose)

```bash
cd ai-server
cp .env.example .env

# İmajı derle ve çalıştır (build-time guard eksik artefaktları açıkça raporlar)
docker build -t dermind-ai .
docker run -p 8000:8000 --env-file .env dermind-ai
```

> **Not:** Dockerfile build-time'da `dermind_knn_product_vectors.csv`, `models/xgboost_scoring_model.json`, `models/model_config.json`, `models/knn_recommender_model.pkl`, `models/feature_scaler.pkl`, `models/shap_explainer.pkl` varlığını kontrol eder. Eksikse açık `FATAL: ... missing` mesajıyla erken patlar.

---

## API Endpointleri

Sunucu: `http://localhost:8000`
Swagger UI: `http://localhost:8000/docs`

> `INTERNAL_API_KEY` ayarlıysa tüm `/score`, `/score/batch`, `/recommend`, `/explain`, `/explain/stream` endpointleri `X-Internal-Key` header zorunludur.

---

### GET /health

Sunucu ve model sağlık kontrolü. Auth gerektirmez.

```json
{
  "status": "ok",
  "model": "xgboost",
  "version": "2.0",
  "total_products": 4692,
  "xgb_r2": 0.9999
}
```

---

### GET /metrics

Uptime, cache istatistikleri, **LLM call/error counter'ları**, request sayaçları.

```json
{
  "uptime_seconds": 1820.4,
  "cache": {
    "size": 23, "maxsize": 500, "ttl_seconds": 3600,
    "hits": 142, "misses": 88, "hit_rate_pct": 61.7
  },
  "llm": {
    "provider": "ollama", "model": "llama3.1",
    "calls": 88, "errors": 2, "error_rate_pct": 2.3
  },
  "request_counts": { "POST /score": 419, "POST /explain": 90 },
  "model": { "total_products": 4692, "scoring_features": 28, "knn_features": 24 }
}
```

---

### POST /score

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: <secret>" \
  -d '{
    "sephora_product_id": "P398965",
    "user": {
      "skin_type": "oily",
      "has_acne": false,
      "allergies": ["fragrance"]
    },
    "is_recommended": 0.5
  }'
```

```json
{
  "product_id": "P398965",
  "product_name": "Rose Lip Conditioner",
  "brand": "AERIN",
  "base_score": 5.1,
  "personal_score": 5.8,
  "skin_type": "oily",
  "allergen_warnings": ["fragrance"]
}
```

- `is_recommended` (opsiyonel, 0.0–1.0): Backend'in `UserProductRating.wouldRecommend` ortalaması. Verilmezse 0.5 (nötr) — cold-start.
- `allergen_warnings`: Ürün ingredients metninde geçen kullanıcı allergen'leri.
- `skin_type`: `dry | oily | combination | normal` (model bu 4 tip için eğitildi; `sensitive` 422 döner).

---

### POST /score/batch

Maks 50 ürün, partial error desteği.

```json
{
  "results": [ { "product_id": "P476416", "personal_score": 4.1, ... } ],
  "errors":  [ { "product_id": "INVALID", "error": "Ürün bulunamadı" } ]
}
```

---

### POST /recommend

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user": { "skin_type": "dry", "has_acne": false, "allergies": ["paraben"] },
    "category": "Skincare",
    "secondary_category": "Moisturizers",
    "top_k": 5
  }'
```

```json
{
  "user_skin_type": "dry",
  "category_filter": "Moisturizers",
  "recommendations": [ { "product_id": "...", "similarity": 0.943, ... } ]
}
```

**Allergic kullanıcılar için 3 katmanlı filtre + son çare fallback** (sırayla, ilk yeterli olan uygulanır):
1. **Text-level match** — ürün ingredients metninde allergen geçenleri çıkar (en sıkı)
2. CosIng `banned=0 AND restricted=0`
3. CosIng `banned=0`
4. *Son çare:* `penalty_score` median altı

**Performans:** Kategori veya allergy filtresi yoksa, startup'ta fit edilmiş `knn_model` yeniden kullanılır — istek başına refit yok.

---

### POST /explain

SHAP ile puana etki eden faktörleri hesaplar, **Ollama veya OpenAI** ile doğal dilde açıklar. İlk çağrıda 5–30 saniye, cache hit'te anında.

```json
{
  "product_id": "P476416",
  "base_score": 5.4,
  "personal_score": 4.1,
  "language": "tr",
  "shap_factors": [
    { "feature": "is_recommended", "effect": 1.32, "direction": "ARTIRAN" },
    { "feature": "penalty_score", "effect": -0.51, "direction": "DUSUREN" }
  ],
  "explanation": "Bu ürün genel olarak kaliteli olsa da...",
  "cached": false,
  "llm_error": false
}
```

**Cache key**: `product_id + skin_type + has_acne + allergies + is_recommended + language` (1 saatlik TTL). LLM hatası **cache'lenmez** — ikinci çağrıda yeniden denenir.

---

### POST /explain/stream  *(yeni)*

Server-Sent Events (text/event-stream) ile streaming. **TTFB ~300ms** (SHAP), tam yanıt ~30sn.

```bash
curl -N -X POST http://localhost:8000/explain/stream \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: <secret>" \
  -d '{ "sephora_product_id": "P476416", "user": {...}, "language": "tr" }'
```

```
data: {"type":"meta","product_id":"P476416","base_score":5.4,"shap_factors":[...]}

data: {"type":"token","text":"Bu "}
data: {"type":"token","text":"ürün "}
data: {"type":"token","text":"yağlı "}
...
data: {"type":"done","cached":false,"llm_error":false}
```

**Event tipleri:**
- `meta` — anında, SHAP factors + scores
- `token` — LLM'den parça parça (cache hit'te tek event)
- `done` — final flag'ler

Frontend tarafında `EventSource` veya `fetch` + `ReadableStream` ile parse edilir.

---

## Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|-----------|---------|
| `LLM_PROVIDER` | `ollama` | `ollama` veya `openai` |
| `OLLAMA_HOST` | `http://localhost:11434` | Docker içinde `http://host.docker.internal:11434` |
| `OLLAMA_MODEL` | `llama3.1` | |
| `OPENAI_API_KEY` | — | `LLM_PROVIDER=openai` ise zorunlu |
| `OPENAI_MODEL` | `gpt-4o-mini` | |
| `INTERNAL_API_KEY` | — | Boş bırakılırsa internal auth devre dışı |
| `ALLOWED_ORIGINS` | `*` | Production'da backend URL'ini yaz |
| `EXPLAIN_CACHE_TTL` | `3600` | Saniye |
| `EXPLAIN_CACHE_MAX` | `500` | Maksimum cache girdisi |
| `SHAP_EFFECT_THRESHOLD` | `0.01` | Bu altı SHAP etkisi response'tan çıkarılır |
| `SCORE_RATE_LIMIT` | `60/minute` | slowapi formatı |
| `RECOMMEND_RATE_LIMIT` | `30/minute` | |
| `EXPLAIN_RATE_LIMIT` | `10/minute` | LLM = para; sıkı tut |
| `OTEL_ENABLED` | `false` | OpenTelemetry tracing aktif/pasif |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | gRPC OTLP collector |
| `OTEL_SERVICE_NAME` | `dermind-ai-server` | Trace'lerde görünen servis adı |

---

## Rate Limiting

Per-IP token bucket (slowapi). Limitler env üzerinden override edilebilir.

| Endpoint | Default | Sebep |
|----------|---------|-------|
| `/score`, `/score/batch` | 60/dk | XGBoost ucuz |
| `/recommend` | 30/dk | KNN orta |
| `/explain`, `/explain/stream` | 10/dk | LLM = ücret/yük |

Limit aşılırsa `429 Too Many Requests` döner.

---

## Distributed Tracing (OpenTelemetry)

`OTEL_ENABLED=true` ile auto-instrument:

- FastAPI HTTP request'leri (`http.server.duration`)
- Çıkış HTTP çağrıları (`requests` library)
- Özel span'lar: `xgb.predict`, `llm.chat.completions`

Backend'in Spring Boot tarafı `micrometer-tracing-bridge-otel` ile aynı OTLP collector'a span gönderir → **cross-service trace ID propagation**: tek bir `traceId` ile mobil → backend → AI server → LLM yolculuğu görünür.

```bash
# Jaeger ile lokal test
docker run -d -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one:latest
# .env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
# Jaeger UI
open http://localhost:16686
```

OpenTelemetry paketleri kurulu değilse `OTEL_ENABLED=true` olsa bile **graceful skip** — sunucu kalkar, sadece tracing kapalı kalır.

---

## Allergen Text Matching

`build_dataset_v2.py`, `dermind_knn_product_vectors.csv`'ye `ingredients_text` kolonu (pipe-separated, lowercase) ekler. Bu sayede:

- `/score` response'unda `allergen_warnings: ["paraben", ...]` döner
- `/recommend` allergic kullanıcılar için ingredient-text-level filtre uygular
- CosIng veritabanında olmayan ingredient'lar bile yakalanır (ör. "fragrance oil" → "fragrance" kullanıcı allergen'i ile match'lenir)

`ingredients_text` kolonu yoksa text matching otomatik devre dışı kalır, CosIng tabanlı filtre devreye girer.

---

## Model Performansı

### XGBoost Regresyon Metrikleri (Test: 144,924 satır; train 676,309 / val 144,924)

| Metrik | Değer |
|--------|-------|
| MAE | **0.0097** |
| RMSE | **0.0157** |
| R² | **0.9999** |
| 5-Fold CV R² | **0.9985 ± 0.0009** |
| ±1 puan | **%100** |
| ±0.5 puan | **%100** |

### En Etkili Özellikler (SHAP — `models/model_config.json` `shap_top10`)

| # | Özellik | Ortalama \|SHAP\| |
|---|---------|---------------|
| 1 | rating | 0.6700 |
| 2 | base_score | 0.5662 |
| 3 | good_for_acne | 0.1309 |
| 4 | good_for_oily | 0.1296 |
| 5 | skin_dry | 0.0919 |

> Backend `UserProductRating.wouldRecommend` ortalamasını `is_recommended` olarak göndermeye devam eder; cold-start kullanıcı için 0.5 (nötr).

---

## Temel Kavramlar

### Base Score ve Personal Score

**Base score** kullanıcıdan bağımsız ürün kalite puanı (1–10):

```
base_score = (sephora_rating / 5) × 10 × 0.6
           + min(faydali_madde / 10, 1) × 2
           - min(kacinilacak / 5, 1) × 1
           - min(penalty_score / 10, 1) × 2
```

**Personal score**, XGBoost'un kullanıcı profiliyle (cilt tipi, akne, alerji, geçmiş tavsiye oranı) ürettiği kişisel puan. Base score üzerine ±2 puana kadar kayabilir.

### KNN Öneri Sistemi

4.692 ürün × 24 özellik (cilt tipi uyumluluğu, ingredient kategorileri, kalite metrikleri). Cosine similarity. Startup'ta fit edilir, no-filter durumda yeniden kullanılır.

### SHAP + LLM (Explainable AI)

SHAP, her özelliğin son puana kaç puan kattığını sayısal olarak hesaplar. Bu değerler LLM'e gönderilerek kullanıcıya Türkçe/İngilizce doğal dil açıklaması üretilir. Streaming endpoint ile token-by-token akış mümkün.

### Cold-Start Davranışı

Yeni kullanıcı (henüz `UserProductRating` yok):
- `is_recommended` → 0.5 (nötr)
- KNN user vector → dataset median değerleri (`rating`, `price_usd`, `ingredient_count` median'larından türetilir, hardcoded sabit değil)

---

## Dosya Yapısı

```
ai-server/
├── app.py                           ← FastAPI: score, recommend, explain, /stream, metrics
├── features.py                      ← SCORING_FEATURES + KNN_FEATURES (tek doğru kaynak)
├── train_models_v2.py               ← Eğitim pipeline (XGBoost + RF + KNN + SHAP + 5-fold CV)
├── build_dataset_v2.py              ← Sephora + CosIng + SkinCare → CSV (ingredients_text dahil)
├── seed_products.py                 ← CSV → Spring Boot backend POST /api/products (admin token)
├── seed_products_direct.py          ← CSV → PostgreSQL doğrudan (psycopg2, lokal/CI)
├── .env.example                     ← Tüm env vars şablonu
├── requirements.txt                 ← FastAPI + ML + slowapi + opentelemetry + psycopg2-binary
├── Dockerfile                       ← Build-time artefakt guard'ı dahil
├── pytest.ini                       ← Test ayarları
├── TODO.md                          ← Yapılacaklar / bilinen sorunlar
├── HAPPY_PATH_TEST.md               ← Manuel test rehberi
├── dermind_knn_product_vectors.csv  ← 4,692 ürün vektörü + ingredients_text
├── tests/
│   └── test_app.py                  ← 40+ test (unit + business invariants + cold-start)
└── models/
    ├── xgboost_scoring_model.json   ← Ana model (ZORUNLU)
    ├── model_config.json            ← Metrikler + feature listesi (ZORUNLU)
    ├── knn_recommender_model.pkl    ← Pre-fitted KNN
    ├── shap_explainer.pkl
    └── feature_scaler.pkl
```

---

## Testler

```bash
# LLM gerektirmeyen testler (CI için)
pytest tests/ -m "not llm" -v

# Tüm testler (Ollama gerek)
pytest tests/ -v

# Coverage
pytest tests/ -m "not llm" --cov=app --cov-report=term-missing
```

**Test kategorileri:**

| Sınıf | Açıklama |
|-------|----------|
| `TestHealth`, `TestMetrics` | Endpoint shape testleri |
| `TestScore`, `TestScoreBatch` | Validation + happy path |
| `TestRecommend` | KNN response yapısı |
| `TestExplain` | SHAP + LLM (cache, dil, hata davranışı) |
| `TestBusinessInvariants` | Skin one-hot, allergy penalty, is_recommended pass-through, KNN reuse |
| `TestColdStart` | Yeni kullanıcı (rating yok) senaryoları |
