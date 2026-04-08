# DerMind — Happy Path Test Rehberi

Sifirdan, hic bir sey calistirmadan, her seyi test edeceksin.
Bu dokuman 5 asamadan olusuyor.

---

## ASAMA 1 — Ollama Hazirla

Ollama zaten kurulu. Modelin yuklu olup olmadigini kontrol et:

```bash
ollama list
```

`llama3.1` listede yoksa indir (tek seferlik, ~4GB):
```bash
ollama pull llama3.1
```

Ollama'nin ayakta oldugunu dogrula:
```bash
curl http://localhost:11434
# Cevap: "Ollama is running" olmali
```

---

## ASAMA 2 — AI Server'i Baslat

```bash
cd ai-server

# .env dosyasi yoksa olustur
cp .env.example .env

# Sunucuyu baslat
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Beklenen terminal ciktisi:**
```
LLM: Ollama (llama3.1) @ http://localhost:11434
Modeller yukleniyor...
  XGBoost: OK
  SHAP: OK
  KNN: OK (4692 urun)
Modeller hazir.

INFO:     Uvicorn running on http://0.0.0.0:8000
```

Tarayicidan kontrol et: http://localhost:8000/docs
(Swagger UI acilmali — butun endpointler orada gorunur)

---

## ASAMA 3 — Backend'i Baslat

Yeni bir terminal ac:

```bash
cd backend
./mvnw spring-boot:run
```

**Beklenen cikti:**
```
Started DerMindApplication in X.XXX seconds
```

Backend portu: `http://localhost:8080`

---

## ASAMA 4 — AI Server Endpointlerini Test Et

AI Server ayakta (port 8000). Asagidaki curl komutlarini sirayla calistir.

### TEST 1 — Saglik Kontrolu

```bash
curl http://localhost:8000/health
```

**Beklenen yanit:**
```json
{
  "status": "ok",
  "model": "xgboost",
  "version": "2.0",
  "total_products": 4692,
  "xgb_r2": 0.853
}
```

---

### TEST 2 — Urun Puanlama (/score)

Senaryo: **Yagli ciltli, akneli kullanici** bir urun aratiyor.

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P473671",
    "user": {
      "skin_type": "oily",
      "has_acne": true,
      "allergies": []
    }
  }'
```

**Beklenen yanit:**
```json
{
  "product_id": "P473671",
  "product_name": "...",
  "brand": "...",
  "base_score": 6.2,
  "personal_score": 7.8,
  "skin_type": "oily"
}
```

`personal_score > base_score` olmali — urun yagli cilde iyi geliyor demektir.

**Kuru cilt senaryosu** (ayni urun, farkli kullanici):

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P473671",
    "user": {
      "skin_type": "dry",
      "has_acne": false,
      "allergies": []
    }
  }'
```

`personal_score` bu sefer daha dusuk olmali (farkli cilt tipi).

---

### TEST 3 — Urun Onerisi (/recommend)

Senaryo: **Kuru ciltli kullanici** en iyi **gunes kremlerini** istiyor.

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "skin_type": "dry",
      "has_acne": false,
      "allergies": []
    },
    "category": "Skincare",
    "secondary_category": "Sunscreen",
    "top_k": 5
  }'
```

**Beklenen yanit:**
```json
{
  "user_skin_type": "dry",
  "category_filter": "Sunscreen",
  "recommendations": [
    {
      "product_id": "P...",
      "product_name": "...",
      "brand": "...",
      "base_score": 7.4,
      "similarity": 0.923,
      "rating": 4.5,
      "price_usd": 32.0
    },
    ...
  ]
}
```

5 farkli urun gelmeli, `similarity` degerine gore sirali olmali.

**Yagli cilt + nemlendirici** senaryosu:

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "skin_type": "oily",
      "has_acne": true,
      "allergies": []
    },
    "secondary_category": "Moisturizers",
    "top_k": 3
  }'
```

---

### TEST 4 — XAI Aciklama (/explain)

Senaryo: Kullanici "neden bu puan?" diye soruyor.
Bu test Ollama'ya istek atacak, **30-60 saniye** surebilir (ilk cagri).

```bash
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P473671",
    "user": {
      "skin_type": "oily",
      "has_acne": true,
      "allergies": []
    },
    "language": "tr"
  }'
```

**Beklenen yanit:**
```json
{
  "product_id": "P473671",
  "product_name": "...",
  "base_score": 6.2,
  "personal_score": 7.8,
  "language": "tr",
  "shap_factors": [
    { "feature": "is_recommended", "effect": 1.32, "direction": "ARTIRAN" },
    { "feature": "penalty_score",  "effect": -0.28, "direction": "DUSUREN" },
    { "feature": "good_for_oily",  "effect": 0.43, "direction": "ARTIRAN" }
  ],
  "explanation": "Bu urun kullanicilarin buyuk cogunlugu tarafindan tavsiye edilmekte olup yagli cilt icin uygun iceriklere sahiptir. Ancak icerdigi bazi kisitli maddeler nedeniyle puani tam yuksege cikamiyor.",
  "cached": false
}
```

**Cache testi** — ayni istegi tekrar at, aninda gelmeli:
```bash
# Ayni komutu tekrar calistir, "cached": true olmali
```

**Ingilizce test:**
```bash
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P473671",
    "user": { "skin_type": "dry", "has_acne": false, "allergies": [] },
    "language": "en"
  }'
```

---

## ASAMA 5 — Backend Endpointlerini Test Et

Backend ayakta (port 8080).

### TEST 5 — Urun Listeleme

```bash
curl http://localhost:8080/api/products
```

Urun tablosu doluysa JSON listesi gelmeli.
Tablo bossa once seed_products.py calistir:

```bash
cd ai-server
python seed_products.py
```

### TEST 6 — Urun Arama

```bash
curl "http://localhost:8080/api/products/search?q=sunscreen"
```

```bash
curl "http://localhost:8080/api/products/search?q=cerave"
```

### TEST 7 — En Kaliteli Urunler

```bash
curl "http://localhost:8080/api/products/top/quality?limit=5"
```

---

## Hata Senaryolari

### "Connection refused" — AI Server calismıyor
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### "Connection refused" — Ollama calismıyor
```bash
ollama serve
```

### "Urun bulunamadi" — yanlis product_id
Gecerli product_id'leri gormek icin:
```bash
cd ai-server
python -c "import pandas as pd; df=pd.read_csv('dermind_knn_product_vectors.csv'); print(df['product_id'].head(20).tolist())"
```

### Backend ayaga kalkmıyor — PostgreSQL baglantisi yok
PostgreSQL servisinin calistigini kontrol et.

### Ollama cok yavas — model boyutu
llama3.1 yerine daha kucuk model dene:
```bash
ollama pull llama3.2:3b    # 2GB, cok daha hizli
# .env'de degistir:
# OLLAMA_MODEL=llama3.2:3b
```

---

## Ozet: Tam Akis

```
Terminal 1: ollama serve              (Ollama - port 11434)
Terminal 2: uvicorn app:app ...       (AI Server - port 8000)
Terminal 3: ./mvnw spring-boot:run    (Backend - port 8080)

Test sirasi:
  1. GET  localhost:8000/health        → AI Server ayakta mi?
  2. POST localhost:8000/score         → Puan tahmini calisiyor mu?
  3. POST localhost:8000/recommend     → KNN oneri calisiyor mu?
  4. POST localhost:8000/explain       → SHAP + Ollama calisiyor mu?
  5. GET  localhost:8080/api/products  → Backend + DB calisiyor mu?
```
