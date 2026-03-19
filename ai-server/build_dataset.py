"""
DerMind - Dataset Generation Pipeline
======================================
Sephora, CosIng ve SkinCare veri setlerini birleştirerek:
  1) dermind_knn_product_vectors.csv  (KNN ürün vektörleri)
  2) dermind_ai_training_dataset.csv  (ML eğitim tablosu)
oluşturur.
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

# Windows console encoding fix
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS = os.path.join(BASE_DIR, "datasets")

# ─────────────────────────────────────────────
# ADIM 1: Sephora Ingredients Temizleme
# ─────────────────────────────────────────────
print("=" * 60)
print("ADIM 1: Sephora ürün verisi yükleniyor ve temizleniyor...")
print("=" * 60)

sephora = pd.read_csv(os.path.join(DATASETS, "sephora_dataset", "product_info.csv"))
print(f"  Toplam ürün: {len(sephora)}")


def parse_sephora_ingredients(raw: str) -> list[str]:
    """
    Sephora'nın karmaşık ingredients formatını temiz listeye çevirir.
    Örnek giriş: "['Aqua, Glycerin, Parfum (Fragrance)']"
    Çıkış: ['aqua', 'glycerin', 'parfum']
    """
    if pd.isna(raw) or not raw:
        return []

    try:
        # String representation of list -> actual list
        parsed = ast.literal_eval(raw)
        if isinstance(parsed, list):
            raw = ", ".join(parsed)
    except (ValueError, SyntaxError):
        pass

    # Alt-etiketleri temizle: "Capri Eau de Parfum:" gibi başlıkları kaldır
    raw = re.sub(r"[A-Z][a-zA-Zéèê\s''-]+:", "", raw)

    # Parantez içi açıklamaları kaldır: (Fragrance), (CI 77891) vb.
    raw = re.sub(r"\([^)]*\)", "", raw)

    # Virgülden böl, temizle
    ingredients = []
    for item in raw.split(","):
        item = item.strip().lower()
        # Yıldız, numara gibi gürültüleri temizle
        item = re.sub(r"[\*\#\[\]\"']", "", item)
        item = re.sub(r"\s+", " ", item).strip()
        # Çok kısa veya boş olanları atla
        if len(item) >= 3:
            ingredients.append(item)

    return list(dict.fromkeys(ingredients))  # sırayı koruyarak unique


sephora["clean_ingredients"] = sephora["ingredients"].apply(parse_sephora_ingredients)
sephora["ingredient_count"] = sephora["clean_ingredients"].apply(len)

# ingredients boş olan ürünleri filtrele
before = len(sephora)
sephora = sephora[sephora["ingredient_count"] > 0].reset_index(drop=True)
print(f"  Ingredients parse edildi. {before - len(sephora)} boş ürün çıkarıldı.")
print(f"  Kalan ürün: {len(sephora)}")

# Tüm benzersiz ingredientleri topla
all_sephora_ingredients = set()
for ing_list in sephora["clean_ingredients"]:
    all_sephora_ingredients.update(ing_list)
print(f"  Toplam benzersiz ingredient: {len(all_sephora_ingredients)}")

# ─────────────────────────────────────────────
# ADIM 2: CosIng Yasaklı/Kısıtlı Madde Eşleştirmesi
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 2: CosIng veritabanı ile eşleştirme yapılıyor...")
print("=" * 60)

cosing = pd.read_csv(os.path.join(DATASETS, "cosIng_dataset",
                                   "COSING_Ingredients-Fragrance Inventory_v2.csv"))

# Sadece kısıtlaması olan maddeleri al
cosing_restricted = cosing[cosing["Restriction"].notna()].copy()
cosing_restricted["inci_clean"] = cosing_restricted["INCI name"].str.strip().str.lower()
cosing_restricted["is_banned"] = cosing_restricted["Restriction"].str.contains(
    r"II/", na=False
).astype(int)
cosing_restricted["is_restricted"] = cosing_restricted["Restriction"].str.contains(
    r"III/", na=False
).astype(int)

print(f"  CosIng toplam madde: {len(cosing)}")
print(f"  Yasaklı (Annex II): {cosing_restricted['is_banned'].sum()}")
print(f"  Kısıtlı (Annex III): {cosing_restricted['is_restricted'].sum()}")

# CosIng isimleri için hızlı lookup sözlüğü oluştur
cosing_names = cosing_restricted["inci_clean"].tolist()
cosing_lookup = {}
for _, row in cosing_restricted.iterrows():
    name = row["inci_clean"]
    cosing_lookup[name] = {
        "is_banned": row["is_banned"],
        "is_restricted": row["is_restricted"],
    }

# Sephora ingredientleri ile CosIng eşleştirmesi
# Önce exact match, bulamazsa fuzzy match (performans için)
print("  Fuzzy matching başlıyor (bu biraz sürebilir)...")

ingredient_cosing_cache = {}


def check_cosing_match(ingredient: str) -> dict:
    """Bir ingredient için CosIng eşleşmesi kontrol eder."""
    if ingredient in ingredient_cosing_cache:
        return ingredient_cosing_cache[ingredient]

    result = {"is_banned": 0, "is_restricted": 0}

    # 1. Exact match
    if ingredient in cosing_lookup:
        result = cosing_lookup[ingredient]
        ingredient_cosing_cache[ingredient] = result
        return result

    # 2. Fuzzy match (eşik %85)
    match = process.extractOne(ingredient, cosing_names, scorer=fuzz.ratio, score_cutoff=85)
    if match:
        matched_name = match[0]
        result = cosing_lookup[matched_name]

    ingredient_cosing_cache[ingredient] = result
    return result


# Her ürün için CosIng skorlarını hesapla
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
        print(f"    ...{idx + 1}/{len(sephora)} ürün işlendi")

sephora["banned_count"] = banned_counts
sephora["restricted_count"] = restricted_counts
sephora["penalty_score"] = penalty_scores

print(f"  CosIng eşleştirmesi tamamlandı.")
print(f"  En az 1 yasaklı madde içeren ürün: {(sephora['banned_count'] > 0).sum()}")
print(f"  En az 1 kısıtlı madde içeren ürün: {(sephora['restricted_count'] > 0).sum()}")

# ─────────────────────────────────────────────
# ADIM 3: SkinCare İngredient Eşleştirmesi (Cilt Tipi Uyumluluğu)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 3: SkinCare cilt tipi uyumluluk analizi yapılıyor...")
print("=" * 60)

skincare = pd.read_csv(os.path.join(DATASETS, "skinCare_dataset", "ingredientsList.csv"))
skincare["name_clean"] = skincare["name"].str.strip().str.lower()

# who_is_it_good_for ve who_should_avoid sütunlarını parse et
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
    """String representation of list -> temiz liste."""
    if pd.isna(val):
        return []
    try:
        items = ast.literal_eval(val)
        return [i.strip().lower() for i in items if i.strip()]
    except (ValueError, SyntaxError):
        return []


# Her skincare ingredient için good_for ve avoid flag'lerini belirle
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

print(f"  SkinCare veritabanı: {len(skincare)} ingredient profili")

# Feature sütunları
GOOD_COLS = ["good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
             "good_for_pigmentation", "good_for_aging", "good_for_uv",
             "good_for_barrier", "good_for_radiance", "good_for_texture",
             "good_for_dark_circles"]
AVOID_COLS = ["avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
              "avoid_pregnancy", "avoid_barrier"]
ALL_FEATURE_COLS = GOOD_COLS + AVOID_COLS

# Sephora ingredient -> SkinCare eşleştirme cache
ingredient_skincare_cache = {}


def get_skincare_profile(ingredient: str) -> dict:
    """Bir ingredient için SkinCare profili döndürür."""
    if ingredient in ingredient_skincare_cache:
        return ingredient_skincare_cache[ingredient]

    # Exact match
    if ingredient in skincare_profiles:
        ingredient_skincare_cache[ingredient] = skincare_profiles[ingredient]
        return skincare_profiles[ingredient]

    # Fuzzy match
    match = process.extractOne(ingredient, skincare_names, scorer=fuzz.ratio, score_cutoff=85)
    if match:
        profile = skincare_profiles.get(match[0], {})
        ingredient_skincare_cache[ingredient] = profile
        return profile

    ingredient_skincare_cache[ingredient] = {}
    return {}


# Her ürün için cilt tipi uyumluluk skorlarını hesapla
print("  Ürün-cilt tipi uyumluluk hesaplanıyor...")

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
        print(f"    ...{idx + 1}/{len(sephora)} ürün işlendi")

for col in ALL_FEATURE_COLS:
    sephora[col] = feature_data[col]

print(f"  Cilt tipi uyumluluk analizi tamamlandı.")
matched_any = sum(1 for i in range(len(sephora))
                  if any(sephora[col].iloc[i] > 0 for col in ALL_FEATURE_COLS))
print(f"  En az 1 skincare eşleşmesi olan ürün: {matched_any}/{len(sephora)}")

# ─────────────────────────────────────────────
# ADIM 4: KNN Product Vectors CSV Oluşturma
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 4: dermind_knn_product_vectors.csv oluşturuluyor...")
print("=" * 60)

vector_cols = [
    "product_id", "product_name", "brand_name", "rating", "price_usd",
    "primary_category", "secondary_category",
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
] + ALL_FEATURE_COLS

product_vectors = sephora[vector_cols].copy()

# Eksik rating ve price değerlerini medyan ile doldur
product_vectors["rating"] = product_vectors["rating"].fillna(
    product_vectors["rating"].median()
)
product_vectors["price_usd"] = product_vectors["price_usd"].fillna(
    product_vectors["price_usd"].median()
)

output_path_vectors = os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv")
product_vectors.to_csv(output_path_vectors, index=False, encoding="utf-8-sig")
print(f"  Kaydedildi: {output_path_vectors}")
print(f"  Satır: {len(product_vectors)}, Sütun: {len(product_vectors.columns)}")

# ─────────────────────────────────────────────
# ADIM 5: AI Training Dataset (Reviews Merge)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("ADIM 5: dermind_ai_training_dataset.csv oluşturuluyor...")
print("=" * 60)

# Reviews dosyalarını yükle (sadece gerekli sütunları)
review_cols = ["product_id", "rating", "is_recommended", "helpfulness",
               "skin_type", "skin_tone"]

print("  Reviews dosyaları yükleniyor...")
review_files = [
    "reviews_0-250.csv", "reviews_250-500.csv", "reviews_500-750.csv",
    "reviews_750-1250.csv", "reviews_1250-end.csv"
]

review_chunks = []
for fname in review_files:
    fpath = os.path.join(DATASETS, "sephora_dataset", fname)
    print(f"    Yükleniyor: {fname}...")
    chunk = pd.read_csv(fpath, usecols=review_cols)
    review_chunks.append(chunk)
    print(f"      -> {len(chunk)} satır")

reviews = pd.concat(review_chunks, ignore_index=True)
print(f"  Toplam review: {len(reviews)}")

# skin_type boş olanları at
reviews = reviews.dropna(subset=["skin_type"]).reset_index(drop=True)
print(f"  skin_type bilgisi olan review: {len(reviews)}")

# helpfulness NaN olanları 0.5 (nötr) ile doldur
reviews["helpfulness"] = reviews["helpfulness"].fillna(0.5)

# Reviews ile product vectors birleştir
product_features = sephora[[
    "product_id", "ingredient_count", "banned_count", "restricted_count",
    "penalty_score"
] + ALL_FEATURE_COLS].copy()

training = reviews.merge(product_features, on="product_id", how="inner")
print(f"  Merge sonrası: {len(training)} satır")

# ─── Kişiselleştirilmiş hedef puan (target_score) hesaplama ───
SKIN_TYPE_GOOD_MAP = {
    "dry": "good_for_dry",
    "oily": "good_for_oily",
    "combination": "good_for_oily",  # combination -> oily'ye yakın
    "normal": None,  # normal cilt tipi her ürünle uyumlu
}

SKIN_TYPE_AVOID_MAP = {
    "dry": "avoid_dry",
    "oily": "avoid_oily",
    "combination": "avoid_combination",
    "normal": None,
}


def calc_target_score(row):
    """Kişiselleştirilmiş hedef puanı hesaplar (1-10 skala)."""
    # Base: Kullanıcının verdiği rating (1-5 -> 2-10 skala)
    base = row["rating"] * 2

    # Bonus: Ürün kullanıcının cilt tipine iyi geliyorsa
    skin = row["skin_type"].lower().strip()
    good_col = SKIN_TYPE_GOOD_MAP.get(skin)
    if good_col and row.get(good_col, 0) > 0:
        base += min(row[good_col], 2)  # Max +2 bonus

    # Acne bonus (eğer ürün akneye iyi geliyorsa, her cilt tipi için geçerli)
    if row.get("good_for_acne", 0) > 0:
        base += 0.5

    # Ceza: Yasaklı/kısıtlı madde
    base -= min(row["penalty_score"], 4)  # Max -4 ceza

    # Ceza: Ürün kullanıcının cilt tipi için kaçınılması gerekenlerdeyse
    avoid_col = SKIN_TYPE_AVOID_MAP.get(skin)
    if avoid_col and row.get(avoid_col, 0) > 0:
        base -= min(row[avoid_col], 2)  # Max -2 ceza

    # Clamp 1-10
    return max(1.0, min(10.0, round(base, 1)))


print("  Hedef puanlar (target_score) hesaplanıyor...")
training["target_score"] = training.apply(calc_target_score, axis=1)

# Streak weight: helpfulness * kullanıcı güvenilirlik çarpanı
# helpfulness zaten 0-1 arası, bunu 0.2-1.5 aralığına map ediyoruz
training["streak_weight"] = 0.2 + (training["helpfulness"] * 1.3)

# skin_type one-hot encoding (model eğitimi için)
skin_dummies = pd.get_dummies(training["skin_type"], prefix="skin")
training = pd.concat([training, skin_dummies], axis=1)

# is_recommended NaN -> 0.5 (bilinmiyor)
training["is_recommended"] = training["is_recommended"].fillna(0.5)

# Çıktı sütunları
output_cols = [
    "product_id", "skin_type", "skin_dry", "skin_oily",
    "skin_combination", "skin_normal",
    "rating", "is_recommended", "helpfulness", "streak_weight",
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
] + ALL_FEATURE_COLS + ["target_score"]

# Sütun isimlerini kontrol et (skin_ dummies yoksa ekle)
for col in output_cols:
    if col not in training.columns:
        training[col] = 0

training_out = training[output_cols]

output_path_training = os.path.join(BASE_DIR, "dermind_ai_training_dataset.csv")
training_out.to_csv(output_path_training, index=False, encoding="utf-8-sig")
print(f"  Kaydedildi: {output_path_training}")
print(f"  Satır: {len(training_out)}, Sütun: {len(training_out.columns)}")

# ─────────────────────────────────────────────
# ADIM 6: Doğrulama Raporu
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("DOĞRULAMA RAPORU")
print("=" * 60)

print(f"\n[1] dermind_knn_product_vectors.csv")
print(f"    Satır: {len(product_vectors)}")
print(f"    Sütun: {list(product_vectors.columns)}")
print(f"    Rating aralığı: {product_vectors['rating'].min():.1f} - {product_vectors['rating'].max():.1f}")
print(f"    Penalty score dağılımı:")
print(f"      0 (temiz): {(product_vectors['penalty_score'] == 0).sum()}")
print(f"      1-3: {((product_vectors['penalty_score'] >= 1) & (product_vectors['penalty_score'] <= 3)).sum()}")
print(f"      4+: {(product_vectors['penalty_score'] >= 4).sum()}")

print(f"\n[2] dermind_ai_training_dataset.csv")
print(f"    Satır: {len(training_out)}")
print(f"    Sütun: {list(training_out.columns)}")
print(f"    Cilt tipi dağılımı:")
for st in training_out["skin_type"].value_counts().items():
    print(f"      {st[0]}: {st[1]}")
print(f"    Target score istatistikleri:")
print(f"      Min: {training_out['target_score'].min()}")
print(f"      Max: {training_out['target_score'].max()}")
print(f"      Ortalama: {training_out['target_score'].mean():.2f}")
print(f"      Medyan: {training_out['target_score'].median():.1f}")
print(f"    Streak weight dağılımı:")
print(f"      Min: {training_out['streak_weight'].min():.2f}")
print(f"      Max: {training_out['streak_weight'].max():.2f}")
print(f"      Ortalama: {training_out['streak_weight'].mean():.2f}")

print("\n✓ Pipeline tamamlandı!")
