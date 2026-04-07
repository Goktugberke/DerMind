"""
DerMind - Optimized Dataset Generation Pipeline v2
====================================================
Degisiklikler (v1'e gore):
  - Kategori filtreleme: Sadece Skincare, Makeup, Bath & Body (Men, Tools, Mini, Fragrance, Hair cikarildi)
  - base_score: Kullanicidan bagimsiz urun kalite puani (1-10)
  - Gelistirilmis target_score: base_score uzerinden kisisel modifikasyonlar
  - Daha zengin feature engineering
  - Sentetik Cold Start verisi uretimi (50K satir)

Ciktilar:
  1) dermind_knn_product_vectors.csv  (Filtrelenmis urun vektorleri)
  2) dermind_ai_training_dataset.csv  (Gercek review verisiyle egitim tablosu)
  3) dermind_synthetic_coldstart.csv  (Sentetik cold start verisi)
"""

import ast
import re
import os
import sys
import warnings
import numpy as np
import pandas as pd
from thefuzz import fuzz, process

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS = os.path.join(BASE_DIR, "datasets")

# Sadece anlamli kategoriler (puanlanabilir, cilt ile iliskili)
ALLOWED_CATEGORIES = {"Skincare", "Makeup", "Bath & Body"}

# ─────────────────────────────────────────────
# ADIM 1: Sephora Ingredients Temizleme + Kategori Filtresi
# ─────────────────────────────────────────────
print("=" * 60)
print("ADIM 1: Sephora verisi yukleniyor, temizleniyor, filtreleniyor")
print("=" * 60)

sephora = pd.read_csv(os.path.join(DATASETS, "sephora_dataset", "product_info.csv"))
print(f"  Ham urun sayisi: {len(sephora)}")

# Kategori filtresi
before_filter = len(sephora)
sephora = sephora[sephora["primary_category"].isin(ALLOWED_CATEGORIES)].reset_index(drop=True)
removed = before_filter - len(sephora)
print(f"  Kategori filtresi (Skincare/Makeup/Bath&Body): {removed} urun cikarildi")
print(f"  Kalan: {len(sephora)}")
print(f"  Kategori dagilimi:")
for cat, cnt in sephora["primary_category"].value_counts().items():
    print(f"    {cat}: {cnt}")


def parse_sephora_ingredients(raw: str) -> list[str]:
    """Sephora'nin karmasik ingredients formatini temiz listeye cevirir."""
    if pd.isna(raw) or not raw:
        return []
    try:
        parsed = ast.literal_eval(raw)
        if isinstance(parsed, list):
            raw = ", ".join(parsed)
    except (ValueError, SyntaxError):
        pass

    raw = re.sub(r"[A-Z][a-zA-Z\u00e9\u00e8\u00ea\s''-]+:", "", raw)
    raw = re.sub(r"\([^)]*\)", "", raw)

    ingredients = []
    for item in raw.split(","):
        item = item.strip().lower()
        item = re.sub(r"[\*\#\[\]\"']", "", item)
        item = re.sub(r"\s+", " ", item).strip()
        if len(item) >= 3:
            ingredients.append(item)

    return list(dict.fromkeys(ingredients))


sephora["clean_ingredients"] = sephora["ingredients"].apply(parse_sephora_ingredients)
sephora["ingredient_count"] = sephora["clean_ingredients"].apply(len)

before = len(sephora)
sephora = sephora[sephora["ingredient_count"] > 0].reset_index(drop=True)
print(f"  Ingredients parse edildi. {before - len(sephora)} bos urun cikarildi.")
print(f"  Kalan urun: {len(sephora)}")

all_sephora_ingredients = set()
for ing_list in sephora["clean_ingredients"]:
    all_sephora_ingredients.update(ing_list)
print(f"  Toplam benzersiz ingredient: {len(all_sephora_ingredients)}")

# ─────────────────────────────────────────────
# ADIM 2: CosIng Yasakli/Kisitli Madde Eslestirmesi
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 2: CosIng veritabani ile eslestirme")
print("=" * 60)

cosing = pd.read_csv(os.path.join(DATASETS, "cosIng_dataset",
                                   "COSING_Ingredients-Fragrance Inventory_v2.csv"))

cosing_restricted = cosing[cosing["Restriction"].notna()].copy()
cosing_restricted["inci_clean"] = cosing_restricted["INCI name"].str.strip().str.lower()
cosing_restricted["is_banned"] = cosing_restricted["Restriction"].str.contains(
    r"II/", na=False
).astype(int)
cosing_restricted["is_restricted"] = cosing_restricted["Restriction"].str.contains(
    r"III/", na=False
).astype(int)

print(f"  CosIng toplam madde: {len(cosing)}")
print(f"  Yasakli (Annex II): {cosing_restricted['is_banned'].sum()}")
print(f"  Kisitli (Annex III): {cosing_restricted['is_restricted'].sum()}")

cosing_names = cosing_restricted["inci_clean"].tolist()
cosing_lookup = {}
for _, row in cosing_restricted.iterrows():
    name = row["inci_clean"]
    cosing_lookup[name] = {
        "is_banned": row["is_banned"],
        "is_restricted": row["is_restricted"],
    }

print("  Fuzzy matching basliyor...")
ingredient_cosing_cache = {}


def check_cosing_match(ingredient: str) -> dict:
    if ingredient in ingredient_cosing_cache:
        return ingredient_cosing_cache[ingredient]

    result = {"is_banned": 0, "is_restricted": 0}

    if ingredient in cosing_lookup:
        result = cosing_lookup[ingredient]
        ingredient_cosing_cache[ingredient] = result
        return result

    match = process.extractOne(ingredient, cosing_names, scorer=fuzz.ratio, score_cutoff=85)
    if match:
        result = cosing_lookup[match[0]]

    ingredient_cosing_cache[ingredient] = result
    return result


banned_counts = []
restricted_counts = []
penalty_scores = []

for idx, row in sephora.iterrows():
    banned = 0
    restricted = 0
    for ing in row["clean_ingredients"]:
        res = check_cosing_match(ing)
        banned += res["is_banned"]
        restricted += res["is_restricted"]
    banned_counts.append(banned)
    restricted_counts.append(restricted)
    penalty_scores.append(banned * 3 + restricted * 1)
    if (idx + 1) % 1000 == 0:
        print(f"    ...{idx + 1}/{len(sephora)} urun islendi")

sephora["banned_count"] = banned_counts
sephora["restricted_count"] = restricted_counts
sephora["penalty_score"] = penalty_scores

print(f"  CosIng eslestirmesi tamamlandi.")
print(f"  En az 1 yasakli madde iceren urun: {(sephora['banned_count'] > 0).sum()}")

# ─────────────────────────────────────────────
# ADIM 3: SkinCare Ingredient Eslestirmesi (Cilt Tipi Uyumlulugu)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 3: SkinCare cilt tipi uyumluluk analizi")
print("=" * 60)

skincare = pd.read_csv(os.path.join(DATASETS, "skinCare_dataset", "ingredientsList.csv"))
skincare["name_clean"] = skincare["name"].str.strip().str.lower()

GOOD_FOR_MAPPING = {
    "dry and dehydrated skin": "good_for_dry",
    "oily": "good_for_oily",
    "acne": "good_for_acne",
    "redness": "good_for_sensitive",
    "sensitive": "good_for_sensitive",
    "pigmentation": "good_for_pigmentation",
    "fine lines": "good_for_aging",
    "wrinkles": "good_for_aging",
    "uv protection": "good_for_uv",
    "impaired skin barrier": "good_for_barrier",
    "blackheads": "good_for_acne",
    "enlarged pores": "good_for_oily",
    "elasticity": "good_for_aging",
    "radiance": "good_for_radiance",
    "dark circles": "good_for_dark_circles",
    "texture": "good_for_texture",
}

AVOID_MAPPING = {
    "dry dehydrated": "avoid_dry",
    "oily": "avoid_oily",
    "sensitive": "avoid_sensitive",
    "combination": "avoid_combination",
    "pregnancy": "avoid_pregnancy",
    "impaired skin barrier": "avoid_barrier",
}


def parse_list_column(val: str) -> list[str]:
    if pd.isna(val):
        return []
    try:
        items = ast.literal_eval(val)
        return [i.strip().lower() for i in items if i.strip()]
    except (ValueError, SyntaxError):
        return []


skincare_profiles = {}
skincare_names = skincare["name_clean"].tolist()

for _, row in skincare.iterrows():
    name = row["name_clean"]
    profile = {}
    good_for = parse_list_column(row.get("who_is_it_good_for", ""))
    for condition in good_for:
        if condition in GOOD_FOR_MAPPING:
            profile[GOOD_FOR_MAPPING[condition]] = 1
    avoid = parse_list_column(row.get("who_should_avoid", ""))
    for condition in avoid:
        if condition in AVOID_MAPPING:
            profile[AVOID_MAPPING[condition]] = 1
    skincare_profiles[name] = profile

print(f"  SkinCare veritabani: {len(skincare)} ingredient profili")

GOOD_COLS = ["good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
             "good_for_pigmentation", "good_for_aging", "good_for_uv",
             "good_for_barrier", "good_for_radiance", "good_for_texture",
             "good_for_dark_circles"]
AVOID_COLS = ["avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
              "avoid_pregnancy", "avoid_barrier"]
ALL_FEATURE_COLS = GOOD_COLS + AVOID_COLS

ingredient_skincare_cache = {}


def get_skincare_profile(ingredient: str) -> dict:
    if ingredient in ingredient_skincare_cache:
        return ingredient_skincare_cache[ingredient]
    if ingredient in skincare_profiles:
        ingredient_skincare_cache[ingredient] = skincare_profiles[ingredient]
        return skincare_profiles[ingredient]
    match = process.extractOne(ingredient, skincare_names, scorer=fuzz.ratio, score_cutoff=85)
    if match:
        profile = skincare_profiles.get(match[0], {})
        ingredient_skincare_cache[ingredient] = profile
        return profile
    ingredient_skincare_cache[ingredient] = {}
    return {}


print("  Urun-cilt tipi uyumluluk hesaplaniyor...")
feature_data = {col: [] for col in ALL_FEATURE_COLS}

for idx, row in sephora.iterrows():
    product_scores = {col: 0 for col in ALL_FEATURE_COLS}
    for ing in row["clean_ingredients"]:
        profile = get_skincare_profile(ing)
        for key, val in profile.items():
            if key in product_scores:
                product_scores[key] += val
    for col in ALL_FEATURE_COLS:
        feature_data[col].append(product_scores[col])
    if (idx + 1) % 1000 == 0:
        print(f"    ...{idx + 1}/{len(sephora)} urun islendi")

for col in ALL_FEATURE_COLS:
    sephora[col] = feature_data[col]

matched_any = sum(1 for i in range(len(sephora))
                  if any(sephora[col].iloc[i] > 0 for col in ALL_FEATURE_COLS))
print(f"  En az 1 skincare eslesmesi olan urun: {matched_any}/{len(sephora)}")

# ─────────────────────────────────────────────
# ADIM 4: BASE SCORE HESAPLAMA (Kullanicidan bagimsiz urun kalitesi)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 4: Base Score hesaplaniyor (kullanicidan bagimsiz kalite puani)")
print("=" * 60)


def calc_base_score(row):
    """
    Kullanicidan bagimsiz urun kalite puani (1-10).
    Bilesenleri:
      - Sephora rating (en buyuk agirlik, gercek kullanici puani)
      - Ingredient zenginligi (skincare eslesmesi fazlaysa bonus)
      - Penalty cezasi (yasakli/kisitli maddeler)
    """
    # Sephora rating -> 1-10 skalasi (en buyuk agirlik: %60)
    rating = row.get("rating", 3.5)
    if pd.isna(rating):
        rating = 3.5
    rating_component = (rating / 5.0) * 10.0  # 0-10

    # Skincare ingredient eslesmesi bonusu (ne kadar cok fayda maddesi varsa o kadar iyi)
    total_good = sum(row.get(col, 0) for col in GOOD_COLS)
    good_component = min(total_good / 10.0, 1.0) * 2.0  # max +2

    # Avoid maddesi cezasi
    total_avoid = sum(row.get(col, 0) for col in AVOID_COLS)
    avoid_component = min(total_avoid / 5.0, 1.0) * 1.0  # max -1

    # CosIng penalty cezasi
    penalty = row.get("penalty_score", 0)
    penalty_component = min(penalty / 10.0, 1.0) * 2.0  # max -2

    base = rating_component * 0.6 + good_component - avoid_component - penalty_component

    return max(1.0, min(10.0, round(base, 1)))


sephora["base_score"] = sephora.apply(calc_base_score, axis=1)

print(f"  Base score istatistikleri:")
print(f"    Min: {sephora['base_score'].min()}")
print(f"    Max: {sephora['base_score'].max()}")
print(f"    Ortalama: {sephora['base_score'].mean():.2f}")
print(f"    Medyan: {sephora['base_score'].median():.1f}")

# ─────────────────────────────────────────────
# ADIM 5: KNN Product Vectors CSV
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 5: dermind_knn_product_vectors.csv olusturuluyor")
print("=" * 60)

vector_cols = [
    "product_id", "product_name", "brand_name", "rating", "price_usd",
    "primary_category", "secondary_category",
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    "base_score",
] + ALL_FEATURE_COLS

product_vectors = sephora[vector_cols].copy()
product_vectors["rating"] = product_vectors["rating"].fillna(product_vectors["rating"].median())
product_vectors["price_usd"] = product_vectors["price_usd"].fillna(product_vectors["price_usd"].median())

output_path_vectors = os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv")
product_vectors.to_csv(output_path_vectors, index=False, encoding="utf-8-sig")
print(f"  Kaydedildi: {output_path_vectors}")
print(f"  Satir: {len(product_vectors)}, Sutun: {len(product_vectors.columns)}")

# ─────────────────────────────────────────────
# ADIM 6: AI Training Dataset (Reviews Merge)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 6: dermind_ai_training_dataset.csv olusturuluyor")
print("=" * 60)

review_cols = ["product_id", "rating", "is_recommended", "helpfulness",
               "skin_type", "skin_tone"]

print("  Reviews dosyalari yukleniyor...")
review_files = [
    "reviews_0-250.csv", "reviews_250-500.csv", "reviews_500-750.csv",
    "reviews_750-1250.csv", "reviews_1250-end.csv"
]

review_chunks = []
for fname in review_files:
    fpath = os.path.join(DATASETS, "sephora_dataset", fname)
    print(f"    Yukleniyor: {fname}...")
    chunk = pd.read_csv(fpath, usecols=review_cols)
    review_chunks.append(chunk)

reviews = pd.concat(review_chunks, ignore_index=True)
print(f"  Toplam review: {len(reviews)}")

reviews = reviews.dropna(subset=["skin_type"]).reset_index(drop=True)
print(f"  skin_type bilgisi olan review: {len(reviews)}")

reviews["helpfulness"] = reviews["helpfulness"].fillna(0.5)

product_features = sephora[[
    "product_id", "ingredient_count", "banned_count", "restricted_count",
    "penalty_score", "base_score"
] + ALL_FEATURE_COLS].copy()

training = reviews.merge(product_features, on="product_id", how="inner")
print(f"  Merge sonrasi: {len(training)} satir")

# ─── Kisisellesirilmis hedef puan (target_score) ───
SKIN_TYPE_GOOD_MAP = {
    "dry": "good_for_dry",
    "oily": "good_for_oily",
    "combination": "good_for_oily",
    "normal": None,
}

SKIN_TYPE_AVOID_MAP = {
    "dry": "avoid_dry",
    "oily": "avoid_oily",
    "combination": "avoid_combination",
    "normal": None,
}


def calc_target_score(row):
    """
    Kisisellesirilmis hedef puani.
    base_score uzerinden kullaniciya ozel modifikasyonlar:
      + Kullanicinin verdigi rating'den bonus/ceza
      + Cilt tipine uyumluluk bonusu
      + Kacinilmasi gereken madde cezasi
    """
    base = row["base_score"]

    # Kullanicinin kendi degerlendirmesi (rating 1-5 -> -2 ile +2 arasi etki)
    user_sentiment = (row["rating"] - 3.0) * 0.8  # 1->-1.6, 3->0, 5->+1.6
    base += user_sentiment

    # Cilt tipine uyumluluk bonusu
    skin = row["skin_type"].lower().strip()
    good_col = SKIN_TYPE_GOOD_MAP.get(skin)
    if good_col and row.get(good_col, 0) > 0:
        base += min(row[good_col] * 0.3, 1.5)  # Max +1.5 bonus

    # Akne bonusu
    if row.get("good_for_acne", 0) > 0:
        base += 0.3

    # UV koruma bonusu (gunes kremleri icin onemli)
    if row.get("good_for_uv", 0) > 0:
        base += 0.2

    # Kacinilmasi gereken madde cezasi (kisisel)
    avoid_col = SKIN_TYPE_AVOID_MAP.get(skin)
    if avoid_col and row.get(avoid_col, 0) > 0:
        base -= min(row[avoid_col] * 0.5, 2.0)  # Max -2.0 ceza

    return max(1.0, min(10.0, round(base, 1)))


print("  Hedef puanlar (target_score) hesaplaniyor...")
training["target_score"] = training.apply(calc_target_score, axis=1)

# Streak weight: helpfulness * kullanici guvenilirlik carpani
training["streak_weight"] = 0.2 + (training["helpfulness"] * 1.3)

# skin_type one-hot encoding
skin_dummies = pd.get_dummies(training["skin_type"], prefix="skin")
training = pd.concat([training, skin_dummies], axis=1)

training["is_recommended"] = training["is_recommended"].fillna(0.5)

output_cols = [
    "product_id", "skin_type", "skin_dry", "skin_oily",
    "skin_combination", "skin_normal",
    "rating", "is_recommended", "helpfulness", "streak_weight",
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    "base_score",
] + ALL_FEATURE_COLS + ["target_score"]

for col in output_cols:
    if col not in training.columns:
        training[col] = 0

training_out = training[output_cols]

output_path_training = os.path.join(BASE_DIR, "dermind_ai_training_dataset.csv")
training_out.to_csv(output_path_training, index=False, encoding="utf-8-sig")
print(f"  Kaydedildi: {output_path_training}")
print(f"  Satir: {len(training_out)}, Sutun: {len(training_out.columns)}")

# ─────────────────────────────────────────────
# ADIM 7: SENTETIK COLD START VERISI (50K satir)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 7: Sentetik Cold Start verisi uretiliyor (50.000 satir)")
print("=" * 60)

np.random.seed(42)

SKIN_TYPES = ["dry", "oily", "combination", "normal"]
N_SYNTHETIC = 50000

# Urun havuzu: gercek urunlerden ornekleme
product_sample_cols = [
    "product_id", "ingredient_count", "banned_count", "restricted_count",
    "penalty_score", "base_score",
] + ALL_FEATURE_COLS

product_pool = sephora[product_sample_cols].copy()

synthetic_rows = []

for i in range(N_SYNTHETIC):
    # Rastgele urun sec
    prod = product_pool.sample(1).iloc[0]
    # Rastgele cilt tipi
    skin = np.random.choice(SKIN_TYPES, p=[0.25, 0.25, 0.35, 0.15])

    # Dermatolojik kurallara dayali puan hesaplama
    score = prod["base_score"]

    # KURAL 1: Cilt tipine uyumluluk
    if skin == "dry" and prod.get("good_for_dry", 0) > 0:
        score += np.random.uniform(0.5, 2.0)
    elif skin == "oily" and prod.get("good_for_oily", 0) > 0:
        score += np.random.uniform(0.5, 2.0)
    elif skin == "combination" and prod.get("good_for_oily", 0) > 0:
        score += np.random.uniform(0.3, 1.5)

    # KURAL 2: Akne & hassas cilt bonusu
    if prod.get("good_for_acne", 0) > 0 and skin in ("oily", "combination"):
        score += np.random.uniform(0.3, 1.0)
    if prod.get("good_for_sensitive", 0) > 0 and skin == "dry":
        score += np.random.uniform(0.2, 0.8)

    # KURAL 3: Komedojenik / avoid cezasi
    if skin == "dry" and prod.get("avoid_dry", 0) > 0:
        score -= np.random.uniform(1.0, 3.0)
    elif skin == "oily" and prod.get("avoid_oily", 0) > 0:
        score -= np.random.uniform(1.0, 3.0)
    elif skin == "combination" and prod.get("avoid_combination", 0) > 0:
        score -= np.random.uniform(0.8, 2.5)
    elif skin == "dry" and prod.get("avoid_sensitive", 0) > 0:
        score -= np.random.uniform(0.5, 1.5)

    # KURAL 4: Yasakli madde -> sert ceza
    if prod["banned_count"] > 0:
        score -= prod["banned_count"] * np.random.uniform(0.5, 1.5)

    # KURAL 5: Hafif gurultu ekle (gercekcilik icin)
    score += np.random.normal(0, 0.3)

    score = max(1.0, min(10.0, round(score, 1)))

    # Sentetik streak weight (yeni kullanici -> dusuk agirlik)
    streak_w = np.random.choice([0.2, 0.3, 0.5, 0.8], p=[0.4, 0.3, 0.2, 0.1])

    row_data = {
        "product_id": prod["product_id"],
        "skin_type": skin,
        "skin_dry": 1 if skin == "dry" else 0,
        "skin_oily": 1 if skin == "oily" else 0,
        "skin_combination": 1 if skin == "combination" else 0,
        "skin_normal": 1 if skin == "normal" else 0,
        "rating": max(1, min(5, round(score / 2))),  # Sentetik rating
        "is_recommended": 1.0 if score >= 6.0 else 0.0,
        "helpfulness": streak_w / 1.5,  # Dusuk guvenilirlik
        "streak_weight": streak_w,
        "ingredient_count": prod["ingredient_count"],
        "banned_count": prod["banned_count"],
        "restricted_count": prod["restricted_count"],
        "penalty_score": prod["penalty_score"],
        "base_score": prod["base_score"],
    }

    for col in ALL_FEATURE_COLS:
        row_data[col] = prod.get(col, 0)

    row_data["target_score"] = score
    synthetic_rows.append(row_data)

    if (i + 1) % 10000 == 0:
        print(f"    ...{i + 1}/{N_SYNTHETIC} sentetik satir uretildi")

synthetic_df = pd.DataFrame(synthetic_rows)

# Sutun sirasini egitim verisiyle ayni yap
synthetic_df = synthetic_df[output_cols]

output_path_synthetic = os.path.join(BASE_DIR, "dermind_synthetic_coldstart.csv")
synthetic_df.to_csv(output_path_synthetic, index=False, encoding="utf-8-sig")
print(f"  Kaydedildi: {output_path_synthetic}")
print(f"  Satir: {len(synthetic_df)}")
print(f"  Cilt tipi dagilimi:")
for st, cnt in synthetic_df["skin_type"].value_counts().items():
    print(f"    {st}: {cnt}")

# ─────────────────────────────────────────────
# DOGRULAMA RAPORU
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("DOGRULAMA RAPORU")
print("=" * 60)

print(f"\n[1] dermind_knn_product_vectors.csv")
print(f"    Satir: {len(product_vectors)}")
print(f"    Kategori: {product_vectors['primary_category'].nunique()} ({', '.join(product_vectors['primary_category'].unique())})")
print(f"    Base score: {product_vectors['base_score'].mean():.2f} ortalama")

print(f"\n[2] dermind_ai_training_dataset.csv")
print(f"    Satir: {len(training_out):,}")
print(f"    Benzersiz urun: {training_out['product_id'].nunique()}")
print(f"    Target score: min={training_out['target_score'].min()}, max={training_out['target_score'].max()}, mean={training_out['target_score'].mean():.2f}")

print(f"\n[3] dermind_synthetic_coldstart.csv")
print(f"    Satir: {len(synthetic_df):,}")
print(f"    Target score: min={synthetic_df['target_score'].min()}, max={synthetic_df['target_score'].max()}, mean={synthetic_df['target_score'].mean():.2f}")
print(f"    Streak weight ortalama: {synthetic_df['streak_weight'].mean():.2f} (dusuk = yeni kullanici)")

print("\n Pipeline v2 tamamlandi!")
