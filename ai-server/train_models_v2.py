"""
DerMind - Optimized Model Training Pipeline v2
================================================
Yenilikler (v1'e gore):
  1) Cold Start Pre-Training: Sentetik veri ile on egitim, sonra gercek veriyle fine-tuning
  2) SHAP XAI: "Puan neden kirildi?" aciklamasi icin feature importance
  3) Gelistirilmis XGBoost (hyperparameter tuning)
  4) KNN kategori-bazli oneri sistemi
  5) Cross-validation ile guclu degerlendirme

Ciktilar (ai-server/models/ altina):
  - xgboost_scoring_model.json       (Ana model - kisiselestirilmis puan)
  - random_forest_scoring_model.pkl  (Karsilastirma modeli)
  - knn_recommender_model.pkl        (Oneri sistemi)
  - feature_scaler.pkl               (KNN icin normalizasyon)
  - shap_explainer.pkl               (XAI icin SHAP aciklayici)
  - model_config.json                (Metrikler ve konfigrasyon)
"""

import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from time import time

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import NearestNeighbors
import xgboost as xgb
import shap

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# VERI YUKLEME
# ─────────────────────────────────────────────
print("=" * 60)
print("VERI YUKLEME")
print("=" * 60)

training_df = pd.read_csv(os.path.join(BASE_DIR, "dermind_ai_training_dataset.csv"))
product_vectors_df = pd.read_csv(os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv"))
synthetic_df = pd.read_csv(os.path.join(BASE_DIR, "dermind_synthetic_coldstart.csv"))

print(f"  Gercek egitim verisi: {len(training_df):,} satir")
print(f"  Sentetik cold start: {len(synthetic_df):,} satir")
print(f"  Urun vektorleri: {len(product_vectors_df)} urun")

# Feature sutunlari
SCORING_FEATURES = [
    "skin_dry", "skin_oily", "skin_combination", "skin_normal",
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    "base_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv",
    "good_for_barrier", "good_for_radiance", "good_for_texture",
    "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
    "is_recommended",
]

TARGET = "target_score"

# ─────────────────────────────────────────────
# BOLUM 1: COLD START PRE-TRAINING
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BOLUM 1: COLD START PRE-TRAINING (Sentetik Veri)")
print("=" * 60)

# Sentetik veriyle baslangic modeli egit
X_syn = synthetic_df[SCORING_FEATURES].copy()
y_syn = synthetic_df[TARGET].copy()
w_syn = synthetic_df["streak_weight"].values

print(f"  Sentetik veri ile on-egitim basliyor...")
t0 = time()

# Cold start modeli: basit XGBoost
coldstart_model = xgb.XGBRegressor(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    random_state=42,
    n_jobs=-1,
    tree_method="hist",
)
coldstart_model.fit(X_syn, y_syn, sample_weight=w_syn, verbose=False)

# Cold start model performansi
cs_pred = coldstart_model.predict(X_syn)
cs_mae = mean_absolute_error(y_syn, cs_pred)
cs_r2 = r2_score(y_syn, cs_pred)
print(f"  Cold Start Model (sadece sentetik veri):")
print(f"    MAE: {cs_mae:.4f}")
print(f"    R2:  {cs_r2:.4f}")
print(f"    Sure: {time() - t0:.1f}s")
print(f"  Bu model, hic gercek kullanici olmadan dermatolojik kurallari biliyor.")

# ─────────────────────────────────────────────
# BOLUM 2: FINE-TUNING (Gercek Veri ile Ince Ayar)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BOLUM 2: FINE-TUNING (Gercek Veri ile Ana Model Egitimi)")
print("=" * 60)

# Gercek veriyi hazirla
X = training_df[SCORING_FEATURES].copy()
y = training_df[TARGET].copy()
weights = training_df["streak_weight"].values

X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
    X, y, weights, test_size=0.2, random_state=42
)

print(f"  Train: {len(X_train):,} | Test: {len(X_test):,}")
print(f"  Feature sayisi: {len(SCORING_FEATURES)}")

# ── 2A: XGBoost (Optimize edilmis) ──
print("\n--- XGBoost Fine-Tuning ---")
t0 = time()

xgb_model = xgb.XGBRegressor(
    n_estimators=500,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=1.0,
    min_child_weight=5,
    gamma=0.1,
    random_state=42,
    n_jobs=-1,
    tree_method="hist",
    early_stopping_rounds=30,
)

# Cold start modelinden baslayarak fine-tune et
# XGBoost'a baslangic modeli vererek devam ettiriyoruz
xgb_model.fit(
    X_train, y_train,
    sample_weight=w_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
    xgb_model=coldstart_model.get_booster(),  # Cold start'tan basla
)

xgb_pred = xgb_model.predict(X_test)
xgb_time = time() - t0

xgb_mae = mean_absolute_error(y_test, xgb_pred)
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
xgb_r2 = r2_score(y_test, xgb_pred)

print(f"  Sure: {xgb_time:.1f}s")
print(f"  MAE:  {xgb_mae:.4f}")
print(f"  RMSE: {xgb_rmse:.4f}")
print(f"  R2:   {xgb_r2:.4f}")

# Cross-validation
print("  5-Fold Cross Validation...")
cv_scores = cross_val_score(
    xgb.XGBRegressor(
        n_estimators=300, max_depth=8, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1, tree_method="hist",
    ),
    X, y, cv=5, scoring="r2", n_jobs=-1,
)
print(f"  CV R2 skorlari: {[f'{s:.4f}' for s in cv_scores]}")
print(f"  CV R2 ortalama: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# Feature importance
importance = xgb_model.feature_importances_
feat_imp = sorted(zip(SCORING_FEATURES, importance), key=lambda x: x[1], reverse=True)
print("\n  En onemli 10 feature:")
for fname, imp in feat_imp[:10]:
    bar = "=" * int(imp * 50)
    print(f"    {fname:30s} {imp:.4f} {bar}")

# ── 2B: Random Forest ──
print("\n--- Random Forest Egitimi ---")
t0 = time()

rf_model = RandomForestRegressor(
    n_estimators=300,
    max_depth=14,
    min_samples_split=10,
    min_samples_leaf=4,
    max_features="sqrt",
    random_state=42,
    n_jobs=-1,
)

rf_model.fit(X_train, y_train, sample_weight=w_train)
rf_pred = rf_model.predict(X_test)
rf_time = time() - t0

rf_mae = mean_absolute_error(y_test, rf_pred)
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
rf_r2 = r2_score(y_test, rf_pred)

print(f"  Sure: {rf_time:.1f}s")
print(f"  MAE:  {rf_mae:.4f}")
print(f"  RMSE: {rf_rmse:.4f}")
print(f"  R2:   {rf_r2:.4f}")

# ── Karsilastirma ──
print("\n--- Model Karsilastirmasi ---")
print(f"  {'Metrik':<10} {'ColdStart':>12} {'XGBoost':>12} {'RF':>12} {'Kazanan':>12}")
print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*12} {'-'*12}")
print(f"  {'MAE':<10} {cs_mae:>12.4f} {xgb_mae:>12.4f} {rf_mae:>12.4f} {'XGBoost' if xgb_mae < rf_mae else 'RF':>12}")
print(f"  {'R2':<10} {cs_r2:>12.4f} {xgb_r2:>12.4f} {rf_r2:>12.4f} {'XGBoost' if xgb_r2 > rf_r2 else 'RF':>12}")

# ─────────────────────────────────────────────
# BOLUM 3: SHAP XAI (Aciklanabilir Yapay Zeka)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BOLUM 3: SHAP XAI - 'Puan Neden Kirildi?' Aciklayicisi")
print("=" * 60)

print("  SHAP TreeExplainer olusturuluyor...")
t0 = time()

explainer = shap.TreeExplainer(xgb_model)

# Test setinden 1000 ornekle SHAP degerlerini hesapla (performans icin)
shap_sample = X_test.sample(min(1000, len(X_test)), random_state=42)
shap_values = explainer.shap_values(shap_sample)

print(f"  SHAP hesaplandi: {time() - t0:.1f}s")

# Ortalama SHAP etkileri
mean_shap = np.abs(shap_values).mean(axis=0)
shap_importance = sorted(zip(SCORING_FEATURES, mean_shap), key=lambda x: x[1], reverse=True)

print("\n  SHAP Feature Importance (Ortalama |SHAP| etkisi):")
for fname, shap_val in shap_importance[:10]:
    bar = "=" * int(shap_val * 20)
    print(f"    {fname:30s} {shap_val:.4f} {bar}")

# ── SHAP DEMO: Tek bir urun icin aciklama ──
print("\n--- SHAP Demo: Yagli cilt + penalty urun aciklamasi ---")

demo_input = pd.DataFrame([{
    "skin_dry": 0, "skin_oily": 1, "skin_combination": 0, "skin_normal": 0,
    "ingredient_count": 22,
    "banned_count": 2, "restricted_count": 3, "penalty_score": 9,
    "base_score": 4.5,
    "good_for_dry": 1, "good_for_oily": 3, "good_for_acne": 2,
    "good_for_sensitive": 1, "good_for_pigmentation": 0, "good_for_aging": 1,
    "good_for_uv": 4, "good_for_barrier": 1, "good_for_radiance": 0,
    "good_for_texture": 1, "good_for_dark_circles": 0,
    "avoid_dry": 0, "avoid_oily": 1, "avoid_sensitive": 0,
    "avoid_combination": 0, "avoid_pregnancy": 0, "avoid_barrier": 0,
    "is_recommended": 1,
}])

demo_pred = xgb_model.predict(demo_input)[0]
demo_shap = explainer.shap_values(demo_input)[0]

print(f"  Tahmin edilen puan: {demo_pred:.1f}/10")
print(f"  Base value (ortalama): {explainer.expected_value:.2f}")
print(f"\n  Puan kirilma sebepleri:")

# SHAP degerlerini sirala (en buyuk etkiden en kucuge)
shap_breakdown = sorted(zip(SCORING_FEATURES, demo_shap, demo_input.iloc[0]),
                        key=lambda x: abs(x[1]), reverse=True)

for feat_name, shap_val, feat_val in shap_breakdown[:8]:
    direction = "+" if shap_val > 0 else ""
    effect = "ARTIRAN" if shap_val > 0 else "DUSUREN"
    print(f"    {feat_name:30s} = {feat_val:<6} -> {direction}{shap_val:.3f} ({effect})")

print(f"\n  XAI Prompt ornegi (OpenAI/LLM'e gonderilecek):")
# En etkili 3 faktor
top_factors = shap_breakdown[:3]
factors_text = []
for feat_name, shap_val, feat_val in top_factors:
    if shap_val > 0:
        factors_text.append(f"{feat_name} degeri {feat_val} (puani +{shap_val:.2f} artirdi)")
    else:
        factors_text.append(f"{feat_name} degeri {feat_val} (puani {shap_val:.2f} dusurdu)")

print(f"  \"Kullanicinin cildi yagli. Urun puani {demo_pred:.1f}/10.")
print(f"   Etki eden faktorler: {'; '.join(factors_text)}.")
print(f"   Bu bilgiyi kullaniciya dermatolojik dilde acikla.\"")

# ─────────────────────────────────────────────
# BOLUM 4: KNN ONERI SISTEMI (Optimize)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BOLUM 4: KNN ONERI SISTEMI (Optimize)")
print("=" * 60)

KNN_FEATURES = [
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    "base_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv",
    "good_for_barrier", "good_for_radiance", "good_for_texture",
    "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
    "rating", "price_usd",
]

knn_data = product_vectors_df[KNN_FEATURES].copy()

scaler = StandardScaler()
knn_data_scaled = scaler.fit_transform(knn_data)

knn_model = NearestNeighbors(
    n_neighbors=10,
    metric="cosine",
    algorithm="brute",
    n_jobs=-1,
)
knn_model.fit(knn_data_scaled)

print(f"  KNN egitildi: {len(knn_data_scaled)} urun, {len(KNN_FEATURES)} feature")
print(f"  Metrik: Cosine Similarity | k=10")
print(f"  Kategoriler: {product_vectors_df['primary_category'].unique().tolist()}")

# ── KNN Demo: Yagli cilt icin gunes kremleri ──
print("\n--- KNN Demo: Yagli cilt icin en iyi gunes kremleri ---")

sunscreens = product_vectors_df[
    product_vectors_df["secondary_category"] == "Sunscreen"
].copy()

if len(sunscreens) > 0:
    ideal_oily = pd.DataFrame([{
        "ingredient_count": 20, "banned_count": 0, "restricted_count": 0,
        "penalty_score": 0, "base_score": 8.0,
        "good_for_dry": 0, "good_for_oily": 5, "good_for_acne": 3,
        "good_for_sensitive": 2, "good_for_pigmentation": 0, "good_for_aging": 0,
        "good_for_uv": 5, "good_for_barrier": 1, "good_for_radiance": 0,
        "good_for_texture": 0, "good_for_dark_circles": 0,
        "avoid_dry": 0, "avoid_oily": 0, "avoid_sensitive": 0,
        "avoid_combination": 0, "avoid_pregnancy": 0, "avoid_barrier": 0,
        "rating": 4.5, "price_usd": 30,
    }])

    user_scaled = scaler.transform(ideal_oily)
    sunscreen_indices = sunscreens.index.tolist()
    sunscreen_data = knn_data_scaled[sunscreen_indices]

    knn_sun = NearestNeighbors(n_neighbors=min(5, len(sunscreens)), metric="cosine", algorithm="brute")
    knn_sun.fit(sunscreen_data)
    distances, local_indices = knn_sun.kneighbors(user_scaled)

    print(f"  Top 5 oneri:")
    for rank, (local_idx, dist) in enumerate(zip(local_indices[0], distances[0]), 1):
        global_idx = sunscreen_indices[local_idx]
        row = product_vectors_df.iloc[global_idx]
        similarity = 1 - dist
        print(f"    {rank}. {row['product_name'][:45]:<45s} "
              f"| {row['brand_name']:<20s} "
              f"| Base: {row['base_score']:.1f} "
              f"| Benzerlik: {similarity:.3f}")

# ── KNN Demo: Kuru cilt icin nemlendirici ──
print("\n--- KNN Demo: Kuru cilt icin en iyi nemlendiriciler ---")

moisturizers = product_vectors_df[
    product_vectors_df["secondary_category"] == "Moisturizers"
].copy()

if len(moisturizers) > 0:
    ideal_dry = pd.DataFrame([{
        "ingredient_count": 25, "banned_count": 0, "restricted_count": 0,
        "penalty_score": 0, "base_score": 8.0,
        "good_for_dry": 5, "good_for_oily": 0, "good_for_acne": 0,
        "good_for_sensitive": 2, "good_for_pigmentation": 0, "good_for_aging": 2,
        "good_for_uv": 0, "good_for_barrier": 3, "good_for_radiance": 2,
        "good_for_texture": 2, "good_for_dark_circles": 0,
        "avoid_dry": 0, "avoid_oily": 0, "avoid_sensitive": 0,
        "avoid_combination": 0, "avoid_pregnancy": 0, "avoid_barrier": 0,
        "rating": 4.5, "price_usd": 40,
    }])

    user_dry_scaled = scaler.transform(ideal_dry)
    moist_indices = moisturizers.index.tolist()
    moist_data = knn_data_scaled[moist_indices]

    knn_m = NearestNeighbors(n_neighbors=min(5, len(moisturizers)), metric="cosine", algorithm="brute")
    knn_m.fit(moist_data)
    distances, local_indices = knn_m.kneighbors(user_dry_scaled)

    print(f"  Top 5 oneri:")
    for rank, (local_idx, dist) in enumerate(zip(local_indices[0], distances[0]), 1):
        global_idx = moist_indices[local_idx]
        row = product_vectors_df.iloc[global_idx]
        similarity = 1 - dist
        print(f"    {rank}. {row['product_name'][:45]:<45s} "
              f"| {row['brand_name']:<20s} "
              f"| Base: {row['base_score']:.1f} "
              f"| Benzerlik: {similarity:.3f}")

# ─────────────────────────────────────────────
# BOLUM 5: MODELLERI KAYDET
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BOLUM 5: MODELLERI KAYDETME")
print("=" * 60)

# XGBoost
xgb_path = os.path.join(MODELS_DIR, "xgboost_scoring_model.json")
xgb_model.save_model(xgb_path)
print(f"  XGBoost: {xgb_path}")

# Cold Start model
cs_path = os.path.join(MODELS_DIR, "coldstart_model.json")
coldstart_model.save_model(cs_path)
print(f"  Cold Start: {cs_path}")

# Random Forest
rf_path = os.path.join(MODELS_DIR, "random_forest_scoring_model.pkl")
joblib.dump(rf_model, rf_path)
print(f"  Random Forest: {rf_path}")

# KNN
knn_path = os.path.join(MODELS_DIR, "knn_recommender_model.pkl")
joblib.dump(knn_model, knn_path)
print(f"  KNN: {knn_path}")

# Scaler
scaler_path = os.path.join(MODELS_DIR, "feature_scaler.pkl")
joblib.dump(scaler, scaler_path)
print(f"  Scaler: {scaler_path}")

# SHAP Explainer
shap_path = os.path.join(MODELS_DIR, "shap_explainer.pkl")
joblib.dump(explainer, shap_path)
print(f"  SHAP Explainer: {shap_path}")

# Config
config = {
    "version": "2.0",
    "scoring_features": SCORING_FEATURES,
    "knn_features": KNN_FEATURES,
    "target": TARGET,
    "coldstart_metrics": {"mae": round(cs_mae, 4), "r2": round(cs_r2, 4)},
    "xgb_metrics": {"mae": round(xgb_mae, 4), "rmse": round(xgb_rmse, 4), "r2": round(xgb_r2, 4)},
    "rf_metrics": {"mae": round(rf_mae, 4), "rmse": round(rf_rmse, 4), "r2": round(rf_r2, 4)},
    "cv_r2_mean": round(cv_scores.mean(), 4),
    "cv_r2_std": round(cv_scores.std(), 4),
    "best_model": "xgboost" if xgb_r2 > rf_r2 else "random_forest",
    "shap_top_features": [{"name": n, "importance": round(float(v), 4)} for n, v in shap_importance[:10]],
    "categories": product_vectors_df["primary_category"].unique().tolist(),
    "total_products": len(product_vectors_df),
    "total_training_rows": len(training_df),
    "total_synthetic_rows": len(synthetic_df),
}

config_path = os.path.join(MODELS_DIR, "model_config.json")
with open(config_path, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print(f"  Config: {config_path}")

# ─────────────────────────────────────────────
# OZET
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("SONUC OZETI")
print("=" * 60)

print(f"""
  Sistemin 3 Katmani:
  ┌─────────────────────────────────────────────────────────┐
  | 1. COLD START (Sentetik Veri ile On-Egitim)             |
  |    -> 50K satirlik dermatolojik kural tabani             |
  |    -> R2: {cs_r2:.4f} (yeni kullanici icin baslangic)         |
  ├─────────────────────────────────────────────────────────┤
  | 2. FINE-TUNED MODEL (Gercek Veri ile Ince Ayar)        |
  |    -> XGBoost: MAE={xgb_mae:.4f}, R2={xgb_r2:.4f}            |
  |    -> RF:      MAE={rf_mae:.4f}, R2={rf_r2:.4f}            |
  |    -> CV R2:   {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})                    |
  |    -> Streak Weight ile sample weighting aktif           |
  ├─────────────────────────────────────────────────────────┤
  | 3. XAI (Aciklanabilir Yapay Zeka)                       |
  |    -> SHAP TreeExplainer ile "neden bu puan?" aciklamasi |
  |    -> OpenAI/LLM entegrasyonu icin hazir prompt format   |
  ├─────────────────────────────────────────────────────────┤
  | 4. KNN ONERI SISTEMI                                    |
  |    -> {len(product_vectors_df)} urun, Cosine Similarity                   |
  |    -> Kategori-bazli filtreleme (Sunscreen, Moisturizer) |
  └─────────────────────────────────────────────────────────┘

  Kaydedilen model dosyalari:""")

for f in sorted(os.listdir(MODELS_DIR)):
    fpath = os.path.join(MODELS_DIR, f)
    size_mb = os.path.getsize(fpath) / (1024 * 1024)
    print(f"    {f} ({size_mb:.1f} MB)")

print(f"\n  TUM MODELLER BASARIYLA EGITILDI!")
