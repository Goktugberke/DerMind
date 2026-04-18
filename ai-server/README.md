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
SHAP ile puana etki eden faktorleri hesaplar, **Ollama (varsayilan) veya OpenAI** ile kullaniciya dogal dilde aciklar.

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

---

## Endpoint Test Rehberi

Sunucu `http://localhost:8000`'de calisirken asagidaki curl komutlarini sirayla calistir.

### 1. Saglik Kontrolu

```bash
curl http://localhost:8000/health
```

**Beklenen sonuc:**
```json
{ "status": "ok", "model": "xgboost", "version": "2.0", "total_products": 4692, "xgb_r2": 0.853 }
```
`status: "ok"` geliyorsa modeller yuklendi, sunucu hazir.

---

### 2. Urun Puanlama — /score

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P476416",
    "user": { "skin_type": "oily", "has_acne": true, "allergies": [] }
  }'
```

**Beklenen sonuc:**
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

**Ne kontrol edilmeli?**
- `base_score` ve `personal_score` 1-10 arasi olmali
- Ayni urunu `skin_type: "dry"` ile cagirinca `personal_score` degismeli (cilt tipine gore kisisellesme calisilyor)
- Gecersiz product_id ile `404` gelmeli: `"sephora_product_id": "YANLIS_ID"`

---

### 3. Urun Onerisi — /recommend

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user": { "skin_type": "dry", "has_acne": false, "allergies": [] },
    "secondary_category": "Sunscreen",
    "top_k": 5
  }'
```

**Beklenen sonuc:**
```json
{
  "user_skin_type": "dry",
  "category_filter": "Sunscreen",
  "recommendations": [
    { "product_id": "P...", "product_name": "...", "brand": "...", "base_score": 7.4, "similarity": 0.923, "rating": 4.5, "price_usd": 32.0 },
    ...
  ]
}
```

**Ne kontrol edilmeli?**
- Tam olarak `top_k` kadar urun gelmeli (5 urun)
- `similarity` degerleri 0-1 arasi olmali, buyukten kucuge sirali olmali
- `secondary_category` olmadan gonderince tum kategorilerden oneri gelmeli
- Gecersiz kategori ile `404` gelmeli

---

### 4. XAI Aciklama — /explain

> Ollama'ya istek atar, **ilk cagri 30-60 saniye** surebilir.

```bash
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{
    "sephora_product_id": "P476416",
    "user": { "skin_type": "oily", "has_acne": true, "allergies": [] },
    "language": "tr"
  }'
```

**Beklenen sonuc:**
```json
{
  "product_id": "P476416",
  "product_name": "...",
  "base_score": 5.4,
  "personal_score": 6.7,
  "language": "tr",
  "shap_factors": [
    { "feature": "is_recommended", "effect": 1.32, "direction": "ARTIRAN" },
    { "feature": "penalty_score",  "effect": -0.28, "direction": "DUSUREN" }
  ],
  "explanation": "Bu urun kullanicilarin buyuk cogunlugu tarafindan tavsiye edilmektedir...",
  "cached": false
}
```

**Ne kontrol edilmeli?**
- `explanation` alani Turkce dogal dil cumlesi olmali (Ollama'dan gelen)
- `shap_factors` listesi en az 3-4 eleman icermeli
- Ayni istegi tekrar atinca `"cached": true` gelmeli ve aninda donemeli
- `language: "en"` ile Ingilizce aciklama gelmeli

---

### Swagger UI (Tum endpointleri tarayicidan test et)

`http://localhost:8000/docs` adresine git. Her endpoint icin "Try it out" butonuna bas, JSON gir, calistir.

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

### Explainable AI (XAI) — SHAP + LLM (Ollama / OpenAI)

SHAP her feature'in puana kac puan kattigini hesaplar.
Bu degerler varsayilan olarak **Ollama llama3.1**'e, istege gore OpenAI'ye gonderilerek kullaniciya dogal dilde aciklanir.

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

---

## Sistem Akis Diyagrami (System Flow) — Guncel

Asagida DerMind uygulamasinin tam kullanici akisi yer almaktadir.
HTML versiyonu icin `docs/system_flow.html` dosyasina bakiniz.

```
[BASLANGIC] Kullanici Uygulamayi Acar
        |
        v
[KARAR] Giris Yapilmis mi?
    |               |
   EVET            HAYIR
    |               |
    |               v
    |     [ISLEM] Google OAuth2 ile Giris
    |               |
    +-------<-------+
        |
        v
[ISLEM] Cilt Profili Formu Doldur
        (Cilt Tipi, Alerjenler)
        |
        v
[VERİ] Veritabanina Kaydet
        (User Profili — PostgreSQL)
        |
        v
[ISLEM] Urun Listesi Istegi
        |
        v
[IC ISLEM] AI Puanlama Motoru
    +-----------------------------------------+
    | 1. Alerjen Kontrolu                     |
    |    Urun ingredientleri kullanici        |
    |    alerjenlerine karsi kontrol edilir.  |
    |    Eslesme varsa puan dusurulur.        |
    |                                         |
    | 2. XGBoost Puanlama                     |
    |    27 feature ile 0-10 arasi            |
    |    Personalized Score hesaplanir.       |
    |    (Cilt tipi, ingredient kalitesi,     |
    |     streak weight, kullanici geçmisi)   |
    |                                         |
    | 3. KNN Oneri Filtreleme                 |
    |    Cosine similarity ile en yakin       |
    |    urun vektorleri bulunur.             |
    +-----------------------------------------+
        |
        v
[ISLEM] Urunler "Kisisellestirilmis Puan" ile Gosterilir
        |
        v
[KARAR] Kullanici Eylem Secer
    |           |           |
    v           v           v
[Urun    [Aciklama    [Favori /
Satinal]  Iste - XAI]  Wishlist]
    |           |           |
    v           v           v
[Streak  [SHAP +      [Wishlist'e
Guncelle] Ollama/      Kaydet]
    |     OpenAI ile       |
    |     Dogal Dil]       |
    v           |           |
[Notification   |           |
Tetiklenir]     |           |
(Streak alert,  |           |
siparis update) |           |
    |           |           |
    +-----------+-----------+
                |
                v
             [BITIS]
```

---

## UML Sinif Diyagrami — Guncel Durum

HTML versiyonu icin `docs/uml_diagram.html` dosyasina bakiniz.

### Mevcut Entity'ler ve Iliskiler

```
User (id:String, email, name, skinType, allergens)
 |-- 1:N --> Streak (currentStreak, longestStreak, usageFrequency,
 |                   usageTime, dailyUsageCounter, totalUses, isActive)
 |-- 1:N --> Purchase (quantity, unitPrice, totalPrice, orderStatus,
 |                     paymentMethod, paymentStatus)
 |-- 1:N --> UserProductRating (rating:1-10, personalizedRating,
 |                               review, skinImprovement, wouldRecommend)
 |-- 1:N --> Notification (title, message, type:NotificationType, isRead)

Product (id:Long, name, brand, ingredients, qualityScore,
         price, category, baseScore, sephoraRating)
 |-- 1:N --> Streak
 |-- 1:N --> Purchase
 |-- 1:N --> UserProductRating

NotificationType Enum:
  ROUTINE_REMINDER | ORDER_UPDATE | STREAK_ALERT |
  SYSTEM_MESSAGE   | STREAK_WARNING | STREAK_BROKEN | PROMOTION
```

### Controller / Service Katmani

```
UserController          --> UserService
ProductController       --> ProductService
                                 \--> AI Server (HTTP: /score, /recommend, /explain)
PurchaseController      --> PurchaseService
StreakController        --> StreakService
NotificationController  --> NotificationService
UserProductRatingController --> UserProductRatingService
```

### Rapordaki UML ile Farklilıklar

| Rapordaki UML | Gercek Durum |
|---|---|
| AiService / RecommendationEngine interface | YOK — ProductService icinde metod olarak var |
| ReminderNotification, SystemNotification alt siniflar | YOK — tek Notification + NotificationType enum |
| User.id: Long | YANLIS — gercekte String (OAuth2) |
| Favorite entity | YOK — implemente edilmemis |
| PurchaseController eksik | VAR — /api/purchases |
| StreakController eksik | VAR — /api/streaks |
| UserProductRatingController eksik | VAR — /api/ratings |

---

## Calistirma

### Gerekli Kutuphaneler
```bash
pip install pandas numpy scikit-learn xgboost shap thefuzz joblib fastapi "uvicorn[standard]" openai python-dotenv psycopg2-binary
```

### LLM Ayari (Ollama — Ucretsiz, Varsayilan)

Ollama zaten kurulu olmali. Modeli yukle (tek seferlik ~4GB):
```bash
ollama pull llama3.1
```

Calistigini dogrula:
```bash
curl http://localhost:11434
# Beklenen: "Ollama is running"
```

`.env` dosyasini olustur:
```bash
cp .env.example .env
# Varsayilan ayarlar Ollama icin hazir, degistirmene gerek yok
```

OpenAI kullanmak istersen `.env` dosyasinda:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Adim Adim Calistirma

> **Not:** `models/` klasoru zaten doluysa 1. ve 2. adimi atlayabilirsin.

```bash
# 1. Veri seti olustur — sadece datasets/ klasoru degistiyse calistir (~10 dk)
python build_dataset_v2.py

# 2. Modelleri egit — sadece veri seti degistiyse calistir (~3-5 dk)
python train_models_v2.py

# 3. Urunleri PostgreSQL'e aktar — sadece ilk kurulumda calistir
python seed_products.py

# 4. API sunucusunu baslat (her seferinde)
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Gecerli Product ID Nasil Bulunur?

Endpoint'leri test etmek icin gercek `sephora_product_id` lazim:

```bash
python -c "
import pandas as pd
df = pd.read_csv('dermind_knn_product_vectors.csv')
print(df[['product_id','product_name','brand_name','primary_category']].head(20).to_string())
"
```

Ya da kategoriye gore filtrele:
```bash
python -c "
import pandas as pd
df = pd.read_csv('dermind_knn_product_vectors.csv')
sunscreen = df[df['secondary_category']=='Sunscreen'][['product_id','product_name','brand_name']].head(5)
print(sunscreen.to_string())
"
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
