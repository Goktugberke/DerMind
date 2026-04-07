# DerMind AI Server

Yapay zeka destekli kisiselllestirilmis kozmetik oneri ve puanlama sistemi.

---

## Sistem Mimarisi

```
┌──────────────────────────────────────────────────────────────────┐
│                        DerMind AI Pipeline                       │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐  │
│  │ Sephora      │    │ CosIng (EU)  │    │ SkinCare INCI       │  │
│  │ 8,494 urun   │───>│ 30,080 madde │───>│ 248 ingredient      │  │
│  │ 1M+ review   │    │ Annex II/III │    │ cilt tipi profili    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬──────────┘  │
│         └──────────┬────────┘───────────────────────┘             │
│                    ▼                                              │
│         ┌──────────────────────┐                                  │
│         │  build_dataset_v2.py │  Veri Birlestirme + Puanlama     │
│         └──────────┬───────────┘                                  │
│                    ▼                                              │
│    ┌───────────────────────────────────────────────────┐          │
│    │  1. dermind_knn_product_vectors.csv (4,692 urun)  │          │
│    │  2. dermind_ai_training_dataset.csv (966K satir)  │          │
│    │  3. dermind_synthetic_coldstart.csv (50K satir)   │          │
│    └──────────────────────┬────────────────────────────┘          │
│                           ▼                                       │
│              ┌────────────────────────┐                           │
│              │  train_models_v2.py    │                           │
│              │  XGBoost / RF / KNN    │                           │
│              │  SHAP XAI              │                           │
│              └────────────┬───────────┘                           │
│                           ▼                                       │
│              ┌────────────────────────┐                           │
│              │  app.py (FastAPI)      │  <- Spring Boot buraya    │
│              │  :8000                 │     HTTP istegi atar      │
│              └────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Endpointleri

Sunucu: `http://localhost:8000`
Swagger UI: `http://localhost:8000/docs`

---

### GET /health
Sunucu saglik kontrolu.

**Response:**
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

### POST /score
Bir urunun base ve kisisellestirilmis puanini dondurur.

**Request:**
```json
{
  "sephora_product_id": "P476416",
  "user": {
    "skin_type": "oily",
    "has_acne": true,
    "allergies": ["paraben"]
  }
}
```

**Response:**
```json
{
  "product_id": "P476416",
  "product_name": "AFRICAN Beauty Butter- Intensive Dry Skin Treatment",
  "brand": "54 Thrones",
  "base_score": 5.4,
  "personal_score": 6.7,
  "skin_type": "oily"
}
```

`skin_type` gecerli degerler: `dry | oily | combination | normal`

---

### POST /recommend
Kullanicinin cilt tipine ve kategorisine gore KNN ile en uygun urunleri onerir.

**Request:**
```json
{
  "user": {
    "skin_type": "dry",
    "has_acne": false,
    "allergies": []
  },
  "category": "Skincare",
  "secondary_category": "Moisturizers",
  "top_k": 5
}
```

**Response:**
```json
{
  "user_skin_type": "dry",
  "category_filter": "Moisturizers",
  "recommendations": [
    {
      "product_id": "P123456",
      "product_name": "...",
      "brand": "...",
      "category": "Moisturizers",
      "base_score": 8.2,
      "similarity": 0.943,
      "rating": 4.6,
      "price_usd": 38.0
    }
  ]
}
```

`secondary_category` gecerli degerler: `Sunscreen | Moisturizers | Cleansers | Treatments | Masks | Eye Care | ...`

---

### POST /explain
SHAP ile puana etki eden faktorleri hesaplar, OpenAI GPT ile kullaniciya dogal dilde aciklar.

**Request:**
```json
{
  "sephora_product_id": "P476416",
  "user": {
    "skin_type": "oily",
    "has_acne": true,
    "allergies": []
  },
  "language": "tr"
}
```

**Response:**
```json
{
  "product_id": "P476416",
  "product_name": "...",
  "base_score": 5.4,
  "personal_score": 6.7,
  "language": "tr",
  "shap_factors": [
    { "feature": "is_recommended", "effect": 1.32,  "direction": "ARTIRAN" },
    { "feature": "penalty_score",  "effect": -0.51, "direction": "DUSUREN" },
    { "feature": "good_for_oily",  "effect": 0.43,  "direction": "ARTIRAN" }
  ],
  "explanation": "Bu urun genel olarak kaliteli olsa da icindeki bazi kisitli maddeler yagli cildinizde tahrislere yol acabilir. Ozellikle yagi dengeleyici icerikleri olmadigi icin kisisel puaniniz genel puanin biraz altinda kaldi.",
  "cached": false
}
```

`language`: `tr` (Turkce, varsayilan) veya `en` (Ingilizce)

**Cache:** Ayni `product_id + skin_type + language` kombinasyonu icin OpenAI tekrar cagirilmaz.

---

## Temel Kavramlar

### Base Score — Formulasi

Kullanicidan **bagımsiz** urun kalite puani (1-10 arasi).

```
base_score = (sephora_rating / 5) x 10 x 0.6       → Rating bileseni (%60 agirlik)
           + min(toplam_faydali_madde / 10, 1) x 2  → Faydali ingredient bonusu (maks +2)
           - min(toplam_kacinilacak / 5, 1) x 1     → Avoid madde cezasi (maks -1)
           - min(penalty_score / 10, 1) x 2          → CosIng yasakli madde cezasi (maks -2)
```

**Ornek:** 4.2/5 Sephora rating, 6 faydali ingredient, 0 yasakli madde:
`(4.2/5) x 10 x 0.6 = 5.04` + `(6/10) x 2 = +1.2` = **Base Score: 6.2/10**

---

### Personalized Score — Formulasi

Kullanicinin **cilt tipine ozel** puan. Base score uzerine eklenir:

```
personal_score = base_score
               + (kullanici_rating - 3.0) x 0.8      → Kullanici hissi (-1.6 ile +1.6)
               + min(cilt_tipi_uyumluluk x 0.3, 1.5) → Cilt tipi bonusu (maks +1.5)
               + 0.3  (akne bonusu — urun akneye iyi geliyorsa)
               + 0.2  (UV bonusu — urun UV korumasi varsa)
               - min(kacinilacak_madde x 0.5, 2.0)   → Kisisel ceza (maks -2.0)
```

**Ornek:** Base=6.2, yagli cilt, 5/5 puan, good_for_oily=3:
`+1.6 + 0.9 + 0.3` = **Personal Score: 9.0/10**

**Not:** Bu formuller XGBoost'un egitim verisindeki etiketleri (target_score) uretmek icin kullanildi.
XGBoost bu etiketlerden gercek dunya patternlerini ogrendi — formul sadece bir baslangic noktasiydi.

---

### Cold Start Problem Cozumu

| Asama | Veri Kaynagi | Model | Ne Zaman |
|-------|-------------|-------|----------|
| 1. Pre-Training | 50K sentetik satir | coldstart_model.json | Hic kullanici yokken |
| 2. Fine-Tuning | 966K Sephora review | xgboost_scoring_model.json | Gercek kullanicilarla |
| 3. Continuous Learning | DerMind kullanicilari | (retrain) | Zamanla iyilesir |

Sentetik veri kurallari: Kuru cilt + Hyaluronic Acid = 8-10 puan, Yagli cilt + komedojenik = 2-4 puan, Alerjen = 1 puan.

---

### Streak Sistemi — Sample Weighting

Dermatolojide cilt yenilenme suresi ~28 gundur.

| Kullanim Suresi | Streak Weight | Anlam |
|----------------|---------------|-------|
| 1-7 gun        | 0.20          | Guvenilmez (koku/doku oyluyordur) |
| 7-28 gun       | 0.50          | Dusuk guven |
| 28-90 gun      | 1.00          | Orta guven |
| 90-140+ gun    | 1.50          | Altin deger |

140 gunluk kullanicinin yorumu, 3 gunluk kullanicidan **7.5x** daha etkili.

---

### Explainable AI (XAI) — SHAP + OpenAI LLM

SHAP her feature'in puana kac puan kattigini hesaplar.
Bu degerler `gpt-4o-mini`'ye gonderilerek kullaniciya dogal dilde aciklanir.

```
SHAP Ornegi:
  is_recommended  → +1.32  (kullanicilar tavsiye ediyor)
  penalty_score   → -0.51  (kisitli madde var)
  good_for_oily   → +0.43  (yagli cilde uygun)
  banned_count    → -0.24  (yasakli madde var)

LLM Ciktisi:
  "Bu urun genel olarak begeni gorsa de icerdigi bazi kisitli maddeler
   nedeniyle kisisel puaniniz genel puanin hafif altinda kaldi."
```

---

## Model Performansi

### Regression Metrikleri (XGBoost, Test: 193K satir)

| Metrik | Deger | Anlam |
|--------|-------|-------|
| MAE | **0.3912** | Ortalama 0.39 puan hata (10 uzerinden) |
| RMSE | **0.5194** | Buyuk hatalara duyarli metrik |
| R2 | **0.8530** | Varyansin %85'ini acikliyor |
| 5-Fold CV R2 | **0.8386 +/- 0.017** | Overfitting yok |
| 1 puan icinde | **%94.9** | 10'dan 9.5'i 1 puan tolerans icinde |
| 0.5 puan icinde | **%72.5** | 10'dan 7'si cok yakin |

### Siniflandirma Raporu (Dusuk/Orta/Yuksek)

| Sinif | Precision | Recall | F1-Score | Destek |
|-------|-----------|--------|----------|--------|
| Dusuk (<4) | 0.75 | 0.62 | **0.68** | 15,812 |
| Orta (4-7) | 0.81 | 0.93 | **0.87** | 123,073 |
| Yuksek (7-10) | 0.87 | 0.63 | **0.73** | 54,347 |
| Weighted Avg | 0.82 | 0.82 | **0.81** | 193,232 |

### Confusion Matrix

```
            Tahmin → Dusuk   Orta   Yuksek
Gercek Dusuk         9,858  5,954       0
       Orta           3,264 114,576   5,233
       Yuksek             0  20,279  34,068
```

Model dusugu yuksek veya yukseği dusuk olarak **hic karistirmiyor** (koseler 0).
En buyuk hata: yuksek puanli urunlerin bir kismini orta olarak tahmin etmek.

### Cilt Tipine Gore MAE

| Cilt Tipi | n | MAE | Gercek Ort. | Tahmin Ort. |
|-----------|---|-----|-------------|-------------|
| Kuru | 36,681 | 0.3883 | 6.30 | 6.31 |
| Yagli | 23,750 | 0.4023 | 6.02 | 6.04 |
| Karma | 106,971 | 0.3897 | 6.08 | 6.08 |
| Normal | 25,830 | 0.3912 | 5.88 | 5.89 |

Tum cilt tiplerinde tahmin ve gercek neredeyse identik — model **bias yapmıyor**.

### En Etkili Ozellikler (SHAP)

| # | Feature | Ortalama Etki |
|---|---------|---------------|
| 1 | is_recommended | 1.3240 |
| 2 | base_score | 0.7798 |
| 3 | penalty_score | 0.2988 |
| 4 | banned_count | 0.1898 |
| 5 | good_for_acne | 0.1190 |
| 6 | good_for_oily | 0.1095 |
| 7 | skin_dry | 0.0958 |
| 8 | good_for_dry | 0.0546 |
| 9 | restricted_count | 0.0413 |
| 10 | skin_normal | 0.0395 |

---

## Calistirma

### Gerekli Kutuphaneler
```bash
pip install pandas numpy scikit-learn xgboost shap thefuzz joblib fastapi "uvicorn[standard]" openai python-dotenv psycopg2-binary
```

### OpenAI Key Ayari
```bash
cp .env.example .env
# .env dosyasini ac, OPENAI_API_KEY degerini doldur
```

### Adim Adim Calistirma
```bash
# 1. Veri seti olustur (~10 dakika)
python build_dataset_v2.py

# 2. Modelleri egit (~3-5 dakika)
python train_models_v2.py

# 3. Urunleri PostgreSQL'e aktar
python seed_products.py

# 4. API sunucusunu baslat
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Dosya Yapisi
```
ai-server/
├── app.py                           # FastAPI (score, recommend, explain)
├── build_dataset_v2.py              # Veri birlestirme pipeline
├── train_models_v2.py               # Model egitim pipeline
├── seed_products.py                 # PostgreSQL urun aktarici
├── .env.example                     # OpenAI key sablonu
├── TODO.md                          # Yapilacaklar listesi
├── dermind_knn_product_vectors.csv  # 4,692 urun vektoru
├── dermind_ai_training_dataset.csv  # 966K satir egitim verisi
├── dermind_synthetic_coldstart.csv  # 50K satir sentetik veri
├── datasets/
│   ├── sephora_dataset/
│   ├── cosIng_dataset/
│   └── skinCare_dataset/
└── models/
    ├── xgboost_scoring_model.json   # Ana model (R2=0.853)
    ├── coldstart_model.json         # Cold start modeli
    ├── random_forest_scoring_model.pkl
    ├── knn_recommender_model.pkl    # Oneri sistemi
    ├── shap_explainer.pkl           # XAI aciklayici
    ├── feature_scaler.pkl           # KNN normalizasyon
    └── model_config.json            # Metrikler + konfig
```
