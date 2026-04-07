# DerMind AI Server

Yapay zeka destekli kisisellestirilmis kozmetik oneri ve puanlama sistemi.

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
│         │                   │                       │             │
│         └──────────┬────────┘───────────────────────┘             │
│                    ▼                                              │
│         ┌──────────────────────┐                                  │
│         │  build_dataset_v2.py │  Veri Birlestirme Pipeline'i     │
│         │  - NLP parse         │                                  │
│         │  - Fuzzy matching    │                                  │
│         │  - Base score        │                                  │
│         │  - Cold start data   │                                  │
│         └──────────┬───────────┘                                  │
│                    ▼                                              │
│    ┌───────────────────────────────────────────────────┐          │
│    │              3 CSV Cikti                          │          │
│    │  1. dermind_knn_product_vectors.csv (4,692 urun)  │          │
│    │  2. dermind_ai_training_dataset.csv (966K satir)  │          │
│    │  3. dermind_synthetic_coldstart.csv (50K satir)   │          │
│    └──────────────────────┬────────────────────────────┘          │
│                           ▼                                       │
│              ┌────────────────────────┐                           │
│              │  train_models_v2.py    │                           │
│              │  - Cold Start Model    │                           │
│              │  - XGBoost (Fine-Tune) │                           │
│              │  - Random Forest       │                           │
│              │  - KNN Recommender     │                           │
│              │  - SHAP XAI            │                           │
│              └────────────┬───────────┘                           │
│                           ▼                                       │
│     ┌──────────────────────────────────────────────────────┐      │
│     │                  models/ dizini                       │      │
│     │  xgboost_scoring_model.json   (Ana puanlama modeli)  │      │
│     │  coldstart_model.json         (Soguk baslangic)      │      │
│     │  random_forest_scoring_model.pkl                     │      │
│     │  knn_recommender_model.pkl    (Oneri sistemi)        │      │
│     │  shap_explainer.pkl           (XAI aciklayici)       │      │
│     │  feature_scaler.pkl           (KNN normalizasyon)    │      │
│     │  model_config.json            (Tum konfigrasyon)     │      │
│     └──────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## Temel Kavramlar

### 1. Base Score (Urun Kalite Puani)

Kullanicidan **bagimsiz**, tamamen urunun kendisine ait kalite puani (1-10 skala). Randomize degil, 4 bilesenden olusan deterministik bir formule dayanir.

**Matematiksel Formul:**

```
base_score = rating_component + good_component - avoid_component - penalty_component
```

| Bilesen | Formul | Agirlik | Aralik |
|---------|--------|---------|--------|
| **Rating** (Sephora kullanici puani) | `(sephora_rating / 5.0) × 10.0 × 0.6` | %60 | 0 - 6.0 |
| **Good Ingredients** (faydali madde) | `min(toplam_good_for_* / 10, 1.0) × 2.0` | Bonus | 0 - +2.0 |
| **Avoid Ingredients** (kacinilacak) | `min(toplam_avoid_* / 5, 1.0) × 1.0` | Ceza | 0 - -1.0 |
| **CosIng Penalty** (yasakli/kisitli) | `min(penalty_score / 10, 1.0) × 2.0` | Ceza | 0 - -2.0 |

> `penalty_score = banned_count × 3 + restricted_count × 1`
> (Yasakli madde 3 puan, kisitli madde 1 puan ceza)

Sonuc `max(1.0, min(10.0, ...))` ile 1-10 arasina clamplenir.

**Ornek Hesaplama — Bir Gunes Kremi:**

```
Sephora rating:  4.2/5
good_for_oily:   3, good_for_uv: 4, good_for_acne: 1  → toplam = 8
avoid_dry:       1                                      → toplam = 1
banned_count:    0, restricted_count: 2                 → penalty = 0×3 + 2×1 = 2

rating_component  = (4.2 / 5.0) × 10.0 × 0.6 = 5.04
good_component    = min(8 / 10, 1.0) × 2.0    = +1.60
avoid_component   = min(1 / 5, 1.0) × 1.0     = -0.20
penalty_component = min(2 / 10, 1.0) × 2.0    = -0.40

base_score = 5.04 + 1.60 - 0.20 - 0.40 = 6.0/10
```

**Neden bu formul?**
- Rating bileseni %60 agirlikta cunku gercek kullancilarin verdigi puan en guvenilir sinyal.
- Good/Avoid bilesenleri SkinCare INCI veritabanindan turetiliyor (248 ingredientin dermatolojik profili).
- CosIng penalty'si Avrupa Birligi'nin resmi yasakli/kisitli madde listesine dayaniyor (Annex II/III).

### 2. Personalized Score (Kisisellesirilmis Puan)

Base score uzerinden kullanicinin **cilt tipine, tercihlerine ve gecmis deneyimine** gore modifiye edilen puan. Bu puan iki asamada uretilir:

**Asama A — Label (Etiket) Uretimi** (egitim verisi icin):

```
target_score = base_score
             + user_sentiment
             + skin_compatibility_bonus
             + acne_bonus
             + uv_bonus
             - personal_avoid_penalty
```

| Bilesen | Formul | Aralik | Aciklama |
|---------|--------|--------|----------|
| **User Sentiment** | `(kullanici_rating - 3.0) × 0.8` | -1.6 ile +1.6 | Rating 1→-1.6, 3→0, 5→+1.6 |
| **Skin Compatibility** | `min(good_for_[cilt_tipi] × 0.3, 1.5)` | 0 ile +1.5 | Ornek: yagli cilt + good_for_oily=3 → +0.9 |
| **Acne Bonus** | `+0.3` (eger good_for_acne > 0) | 0 veya +0.3 | Her cilt tipi icin gecerli |
| **UV Bonus** | `+0.2` (eger good_for_uv > 0) | 0 veya +0.2 | Gunes korumasi olan urunlere bonus |
| **Avoid Penalty** | `min(avoid_[cilt_tipi] × 0.5, 2.0)` | 0 ile -2.0 | Ornek: kuru cilt + avoid_dry=2 → -1.0 |

Cilt tipi esleme tablosu:

| Cilt Tipi | Good Sutunu | Avoid Sutunu |
|-----------|-------------|-------------|
| dry | good_for_dry | avoid_dry |
| oily | good_for_oily | avoid_oily |
| combination | good_for_oily | avoid_combination |
| normal | (bonus yok) | (ceza yok) |

**Ornek Hesaplama — Ayni Gunes Kremi, Yagli Ciltli Kullanici:**

```
base_score = 6.0 (yukaridaki ornekten)

Kullanici 5/5 rating vermis:
  user_sentiment = (5 - 3.0) × 0.8 = +1.6

good_for_oily = 3:
  skin_compatibility = min(3 × 0.3, 1.5) = +0.9

good_for_acne = 1 (> 0):
  acne_bonus = +0.3

good_for_uv = 4 (> 0):
  uv_bonus = +0.2

avoid_oily = 0:
  personal_avoid = 0

target_score = 6.0 + 1.6 + 0.9 + 0.3 + 0.2 - 0 = 9.0/10
→ clamp(1, 10) → 9.0/10
```

**Asama B — Model Tahmini** (production'da):

Yukaridaki formul 966,157 satirlik egitim verisinde **her satir icin** label (target_score) uretmek amaciyla kullanilir. Ardindan XGBoost modeli bu veriyi ogrenir. Production'da model, formulu birebir uygulamak yerine **966K satirdan ogrendigi karmasik oruntuleri** kullanarak tahmin yapar.

```
XGBoost.predict(kullanici_profili + urun_ozellikleri) → kisiselestirilmis_puan
```

Bu yuzden R² = 0.85'tir, 1.00 degil. Model formulu ezberlemez — gercek kullanici review'larindaki **gomulu oruntuleri** (pattern) kesfeder. Ornegin: "combination cilt tipindeki kullanicilar, penalty_score=3 olan urunlere ortalamadan daha dusuk puan veriyor" gibi ilikskileri formulun otesinde kendi basina ogrenebilir.

### 3. Cold Start Problem Cozumu
Sistem 3 asamali bir mimariyle soguk baslangic problemini cozer:

| Asama | Veri Kaynagi | Model | Kullanim |
|-------|-------------|-------|----------|
| 1. Pre-Training | 50K sentetik satir | coldstart_model.json | Hic kullanici yokken |
| 2. Fine-Tuning | 966K gercek review | xgboost_scoring_model.json | Gercek kullanicilarla |
| 3. Continuous Learning | Kullanici geri bildirimleri | (retrain) | Zamanla iyilesir |

**Sentetik Veri Kurallari:**
- Kuru cilt + Hyaluronic Acid = Yuksek puan (8-10)
- Yagli cilt + komedojenik madde = Dusuk puan (2-4)
- Alerjen tespit = Puan direkt 1
- Yeni kullanici streak weight = 0.2-0.5 (dusuk guven)

### 4. Streak Sistemi (Sample Weighting)
Dermatolojide cildin yenilenme suresi ~28 gundur. Kremin etkisini gormek icin en az 28+ gun kullanim gerekir.

| Kullanim Suresi | Streak Weight | Anlami |
|----------------|---------------|--------|
| 1-7 gun        | 0.20          | Guvenilmez (koku/doku oyluyordur) |
| 7-28 gun       | 0.50          | Dusuk guven |
| 28-90 gun      | 1.00          | Orta guven |
| 90-140+ gun    | 1.50          | Altin deger (gercek etki) |

Model egitiminde `sample_weight` parametresiyle uygulaniyor. 140 gunluk kullanicinin yorumu, 3 gunluk kullanicinin yorumundan **7.5 kat** daha etkili.

### 5. Explainable AI (XAI) - SHAP
"Puan neden kirildi?" sorusuna cevap veren sistem. SHAP (SHapley Additive exPlanations) kullanilarak her feature'in puana olan etkisi hesaplaniyor.

**Ornek SHAP Ciktisi:**
```
Urun puani: 5.8/10 (yagli cilt kullanicisi)
  avoid_oily    = 1   -> -0.51 (DUSUREN)
  good_for_oily = 3   -> +0.43 (ARTIRAN)
  banned_count  = 2   -> -0.24 (DUSUREN)
  base_score    = 4.5 -> +0.20 (ARTIRAN)
```

Bu SHAP degerleri OpenAI/ChatGPT API'sine gonderilerek kullaniciya dogal dilde aciklanir:
> "Bu urun genel olarak kaliteli olsa da, icindeki bazi maddeler yagli cildinde sivilcelenmeye yol acabilir. Ozellikle komedojenik icerikleri nedeniyle puanini dusurduk."

### 6. KNN Oneri Sistemi
K-Nearest Neighbors algoritmasi ile kullaniciya en uygun urunleri onerir.

**Nasil calisir:**
1. Kullanici profili bir vektore donusturulur (cilt tipi, tercihler)
2. 4,692 urun de uzayda birer noktadir (feature vektorleri)
3. Cosine Similarity ile en yakin 5-10 urun bulunur
4. Kategori-bazli filtreleme (sadece gunes kremleri, sadece nemlendiriciler)

## Veri Kaynaklari

| Kaynak | Icerik | Guvenilirlik |
|--------|--------|-------------|
| **Sephora Dataset** (Kaggle) | 8,494 urun + 1M+ review | Gercek e-ticaret verisi |
| **CosIng** (Avrupa Komisyonu) | 30,080 kozmetik maddesi, Annex II/III listeleri | **Resmi AB regulatoru** |
| **SkinCare INCI** (INCIDecoder) | 248 ingredientin cilt tipi uyumlulugu | Dermatolojik bilgi |

**Kategori Filtresi:** Sadece anlamli kategoriler tutuldu:
- Skincare (2,420 urun) - gunes kremi, nemlendirici, temizleyici...
- Makeup (2,369 urun) - fondoten, allik, maskara...
- Bath & Body (405 urun) - vucut bakim urunleri

Cikarildi: Men (59), Tools & Brushes (2), Mini Size (266), Fragrance (1,255), Hair (1,272)

## Model Performansi

### Puanlama Modeli (XGBoost vs Random Forest)

| Metrik | XGBoost | Random Forest | Kazanan |
|--------|---------|---------------|---------|
| MAE (Ortalama Hata) | **0.3912** | 0.4039 | XGBoost |
| RMSE | **0.5194** | 0.5265 | XGBoost |
| R² (Aciklayicilik) | **0.8530** | 0.8489 | XGBoost |
| 5-Fold CV R² | **0.8386** | - | XGBoost |

**R² = 0.85** demek: Modelin varyansinin %85'ini aciklayabiliyor. 10 uzerinden puanlamada ortalama **0.39 puan** hata yapiyor.

### En Etkili Ozellikler (SHAP)

| Siralama | Feature | Ortalama SHAP Etkisi |
|----------|---------|---------------------|
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

## Calistirma

### Gerekli Kutuphaneler
```bash
pip install pandas numpy scikit-learn xgboost shap thefuzz joblib
```

### Pipeline Calistirma
```bash
# 1. Veri seti olusturma (ilk calistirma ~10 dakika surebilir)
python build_dataset_v2.py

# 2. Model egitimi (~3 dakika)
python train_models_v2.py
```

### Dosya Yapisi
```
ai-server/
├── build_dataset_v2.py              # Veri birlestirme pipeline'i
├── train_models_v2.py               # Model egitim pipeline'i
├── dermind_knn_product_vectors.csv  # 4,692 urun vektoru
├── dermind_ai_training_dataset.csv  # 966K satir egitim verisi
├── dermind_synthetic_coldstart.csv  # 50K satir sentetik veri
├── datasets/
│   ├── sephora_dataset/             # Sephora urun + review verileri
│   ├── cosIng_dataset/              # AB kozmetik madde veritabani
│   └── skinCare_dataset/            # INCI ingredient profilleri
└── models/
    ├── xgboost_scoring_model.json   # Ana puanlama modeli
    ├── coldstart_model.json         # Soguk baslangic modeli
    ├── random_forest_scoring_model.pkl
    ├── knn_recommender_model.pkl    # Oneri sistemi
    ├── shap_explainer.pkl           # XAI aciklayici
    ├── feature_scaler.pkl           # KNN normalizasyon
    └── model_config.json            # Metrikler ve konfigrasyon
```

## API Entegrasyon Ornegi

Backend (Spring Boot) tarafindan kullanilacak temel endpoint'ler:

```python
# Kisiselestirilmis puan tahmini
POST /api/score
{
    "product_id": 12345,
    "skin_type": "oily",
    "has_acne": true,
    "allergies": ["paraben"]
}
# Response: { "base_score": 6.2, "personal_score": 7.8, "explanation": "..." }

# KNN oneri
POST /api/recommend
{
    "skin_type": "dry",
    "category": "Sunscreen",
    "top_k": 5
}
# Response: [{ "product_name": "...", "score": 8.5, "similarity": 0.87 }, ...]

# SHAP aciklama
POST /api/explain
{
    "product_id": 12345,
    "skin_type": "oily"
}
# Response: { "factors": [{"name": "avoid_oily", "effect": -0.51}, ...], "prompt": "..." }
```
