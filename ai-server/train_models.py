"""
DerMind - Model Training Pipeline
===================================
Oluşturulan veri setleri ile 3 model eğitir:
  1) XGBoost  — Kişiselleştirilmiş puan tahmini (target_score)
  2) Random Forest — Kişiselleştirilmiş puan tahmini (karşılaştırma)
  3) KNN — Ürün öneri sistemi (kullanıcı vektörüne en yakın ürünler)

Çıktılar (ai-server/models/ altına):
  - xgboost_scoring_model.json
  - random_forest_scoring_model.pkl
  - knn_recommender_model.pkl
  - feature_scaler.pkl
"""

import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from time import time

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    classification_report
)
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import NearestNeighbors
import xgboost as xgb

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# VERİ YÜKLEME
# ─────────────────────────────────────────────
print("=" * 60)
print("VERİ YÜKLEME")
print("=" * 60)

training_df = pd.read_csv(os.path.join(BASE_DIR, "dermind_ai_training_dataset.csv"))
product_vectors_df = pd.read_csv(os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv"))

print(f"  Eğitim verisi: {len(training_df):,} satır")
print(f"  Ürün vektörleri: {len(product_vectors_df)} ürün")

# ─────────────────────────────────────────────
# BÖLÜM 1: KİŞİSELLEŞTİRİLMİŞ PUAN TAHMİNİ
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BÖLÜM 1: KİŞİSELLEŞTİRİLMİŞ PUAN TAHMİN MODELLERİ")
print("=" * 60)

# Feature sütunları (model inputları)
SCORING_FEATURES = [
    # Kullanıcı profili (one-hot cilt tipi)
    "skin_dry", "skin_oily", "skin_combination", "skin_normal",
    # Ürün özellikleri
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    # Cilt tipi uyumluluk skorları
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv",
    "good_for_barrier", "good_for_radiance", "good_for_texture",
    "good_for_dark_circles",
    # Kaçınılması gerekenler
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
    # Kullanıcı davranışı
    "is_recommended",
]

TARGET = "target_score"

X = training_df[SCORING_FEATURES].copy()
y = training_df[TARGET].copy()
weights = training_df["streak_weight"].values  # Sample weighting

# Train/Test split (%80 train, %20 test)
X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
    X, y, weights, test_size=0.2, random_state=42
)

print(f"  Train: {len(X_train):,} | Test: {len(X_test):,}")
print(f"  Feature sayısı: {len(SCORING_FEATURES)}")

# ── 1A: XGBoost Modeli ──
print("\n--- XGBoost Eğitimi ---")
t0 = time()

xgb_model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    n_jobs=-1,
    tree_method="hist",  # Hızlı histogram tabanlı eğitim
)

xgb_model.fit(
    X_train, y_train,
    sample_weight=w_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)

xgb_pred = xgb_model.predict(X_test)
xgb_time = time() - t0

xgb_mae = mean_absolute_error(y_test, xgb_pred)
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
xgb_r2 = r2_score(y_test, xgb_pred)

print(f"  Süre: {xgb_time:.1f}s")
print(f"  MAE:  {xgb_mae:.4f}")
print(f"  RMSE: {xgb_rmse:.4f}")
print(f"  R²:   {xgb_r2:.4f}")

# Feature importance
importance = xgb_model.feature_importances_
feat_imp = sorted(zip(SCORING_FEATURES, importance), key=lambda x: x[1], reverse=True)
print("  En önemli 10 feature:")
for fname, imp in feat_imp[:10]:
    bar = "█" * int(imp * 50)
    print(f"    {fname:30s} {imp:.4f} {bar}")

# ── 1B: Random Forest Modeli ──
print("\n--- Random Forest Eğitimi ---")
t0 = time()

rf_model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
)

rf_model.fit(X_train, y_train, sample_weight=w_train)
rf_pred = rf_model.predict(X_test)
rf_time = time() - t0

rf_mae = mean_absolute_error(y_test, rf_pred)
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
rf_r2 = r2_score(y_test, rf_pred)

print(f"  Süre: {rf_time:.1f}s")
print(f"  MAE:  {rf_mae:.4f}")
print(f"  RMSE: {rf_rmse:.4f}")
print(f"  R²:   {rf_r2:.4f}")

# ── Karşılaştırma ──
print("\n--- Model Karşılaştırması ---")
print(f"  {'Metrik':<10} {'XGBoost':>12} {'RandomForest':>14} {'Kazanan':>12}")
print(f"  {'─'*10} {'─'*12} {'─'*14} {'─'*12}")
print(f"  {'MAE':<10} {xgb_mae:>12.4f} {rf_mae:>14.4f} {'XGBoost' if xgb_mae < rf_mae else 'RF':>12}")
print(f"  {'RMSE':<10} {xgb_rmse:>12.4f} {rf_rmse:>14.4f} {'XGBoost' if xgb_rmse < rf_rmse else 'RF':>12}")
print(f"  {'R²':<10} {xgb_r2:>12.4f} {rf_r2:>14.4f} {'XGBoost' if xgb_r2 > rf_r2 else 'RF':>12}")
print(f"  {'Süre':<10} {xgb_time:>11.1f}s {rf_time:>13.1f}s {'XGBoost' if xgb_time < rf_time else 'RF':>12}")

# ─────────────────────────────────────────────
# BÖLÜM 2: KNN ÖNERİ SİSTEMİ
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BÖLÜM 2: KNN ÖNERİ SİSTEMİ")
print("=" * 60)

# KNN için feature sütunları (sayısal ürün özellikleri)
KNN_FEATURES = [
    "ingredient_count", "banned_count", "restricted_count", "penalty_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv",
    "good_for_barrier", "good_for_radiance", "good_for_texture",
    "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
    "rating", "price_usd",
]

knn_data = product_vectors_df[KNN_FEATURES].copy()

# Normalize (KNN mesafe hesabı için zorunlu)
scaler = StandardScaler()
knn_data_scaled = scaler.fit_transform(knn_data)

# KNN modeli (k=10, cosine similarity)
knn_model = NearestNeighbors(
    n_neighbors=10,
    metric="cosine",
    algorithm="brute",
    n_jobs=-1,
)
knn_model.fit(knn_data_scaled)

print(f"  KNN eğitildi: {len(knn_data_scaled)} ürün, {len(KNN_FEATURES)} feature")
print(f"  Metrik: Cosine Similarity")
print(f"  k (komşu sayısı): 10")

# ── KNN Demo: Yağlı cilt için en iyi güneş kremleri ──
print("\n--- KNN Demo: Yağlı cilt için en iyi güneş kremleri ---")

# Skincare > Sunscreen kategorisindeki ürünleri filtrele
sunscreens = product_vectors_df[
    product_vectors_df["secondary_category"] == "Sunscreen"
].copy()

if len(sunscreens) > 0:
    # İdeal kullanıcı vektörü: yağlı cilt, sivilceye meyilli
    ideal_user_vector = pd.DataFrame([{
        "ingredient_count": 20,       # Orta düzey ingredient
        "banned_count": 0,            # Yasaklı madde istemiyoruz
        "restricted_count": 0,        # Kısıtlı madde istemiyoruz
        "penalty_score": 0,           # Temiz ürün
        "good_for_dry": 0,
        "good_for_oily": 5,           # Yağlı cilt için iyi olmalı
        "good_for_acne": 3,           # Akneye iyi olmalı
        "good_for_sensitive": 2,
        "good_for_pigmentation": 0,
        "good_for_aging": 0,
        "good_for_uv": 5,            # UV koruması yüksek olmalı
        "good_for_barrier": 1,
        "good_for_radiance": 0,
        "good_for_texture": 0,
        "good_for_dark_circles": 0,
        "avoid_dry": 0,
        "avoid_oily": 0,              # Yağlı cildin kaçınması gereken 0 olmalı
        "avoid_sensitive": 0,
        "avoid_combination": 0,
        "avoid_pregnancy": 0,
        "avoid_barrier": 0,
        "rating": 4.5,                # Yüksek rating tercih
        "price_usd": 30,              # Orta fiyat
    }])

    user_scaled = scaler.transform(ideal_user_vector)

    # Sadece güneş kremleri arasından ara
    sunscreen_indices = sunscreens.index.tolist()
    sunscreen_data = knn_data_scaled[sunscreen_indices]

    # KNN'i sadece sunscreen verisi ile yeniden fit et
    knn_sunscreen = NearestNeighbors(n_neighbors=min(5, len(sunscreens)), metric="cosine", algorithm="brute")
    knn_sunscreen.fit(sunscreen_data)
    distances, local_indices = knn_sunscreen.kneighbors(user_scaled)

    print(f"  Top 5 öneri (yağlı cilt için en uygun güneş kremleri):")
    for rank, (local_idx, dist) in enumerate(zip(local_indices[0], distances[0]), 1):
        global_idx = sunscreen_indices[local_idx]
        row = product_vectors_df.iloc[global_idx]
        similarity = 1 - dist
        print(f"    {rank}. {row['product_name'][:45]:<45s} "
              f"| {row['brand_name']:<20s} "
              f"| Rating: {row['rating']:.1f} "
              f"| Benzerlik: {similarity:.3f}")

# ── KNN Demo 2: Kuru cilt için nemlendirici ──
print("\n--- KNN Demo: Kuru cilt için en iyi nemlendiriciler ---")

moisturizers = product_vectors_df[
    product_vectors_df["secondary_category"] == "Moisturizers"
].copy()

if len(moisturizers) > 0:
    ideal_dry = pd.DataFrame([{
        "ingredient_count": 25,
        "banned_count": 0,
        "restricted_count": 0,
        "penalty_score": 0,
        "good_for_dry": 5,
        "good_for_oily": 0,
        "good_for_acne": 0,
        "good_for_sensitive": 2,
        "good_for_pigmentation": 0,
        "good_for_aging": 2,
        "good_for_uv": 0,
        "good_for_barrier": 3,
        "good_for_radiance": 2,
        "good_for_texture": 2,
        "good_for_dark_circles": 0,
        "avoid_dry": 0,
        "avoid_oily": 0,
        "avoid_sensitive": 0,
        "avoid_combination": 0,
        "avoid_pregnancy": 0,
        "avoid_barrier": 0,
        "rating": 4.5,
        "price_usd": 40,
    }])

    user_dry_scaled = scaler.transform(ideal_dry)

    moist_indices = moisturizers.index.tolist()
    moist_data = knn_data_scaled[moist_indices]

    knn_moist = NearestNeighbors(n_neighbors=min(5, len(moisturizers)), metric="cosine", algorithm="brute")
    knn_moist.fit(moist_data)
    distances, local_indices = knn_moist.kneighbors(user_dry_scaled)

    print(f"  Top 5 öneri (kuru cilt için en uygun nemlendiriciler):")
    for rank, (local_idx, dist) in enumerate(zip(local_indices[0], distances[0]), 1):
        global_idx = moist_indices[local_idx]
        row = product_vectors_df.iloc[global_idx]
        similarity = 1 - dist
        print(f"    {rank}. {row['product_name'][:45]:<45s} "
              f"| {row['brand_name']:<20s} "
              f"| Rating: {row['rating']:.1f} "
              f"| Benzerlik: {similarity:.3f}")

# ─────────────────────────────────────────────
# BÖLÜM 3: MODELLERİ KAYDET
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BÖLÜM 3: MODELLERİ KAYDETME")
print("=" * 60)

# XGBoost — JSON formatında (taşınabilir, dil bağımsız)
xgb_path = os.path.join(MODELS_DIR, "xgboost_scoring_model.json")
xgb_model.save_model(xgb_path)
print(f"  XGBoost: {xgb_path}")

# Random Forest — joblib (Python pickle)
rf_path = os.path.join(MODELS_DIR, "random_forest_scoring_model.pkl")
joblib.dump(rf_model, rf_path)
print(f"  Random Forest: {rf_path}")

# KNN — model + scaler
knn_path = os.path.join(MODELS_DIR, "knn_recommender_model.pkl")
joblib.dump(knn_model, knn_path)
print(f"  KNN: {knn_path}")

scaler_path = os.path.join(MODELS_DIR, "feature_scaler.pkl")
joblib.dump(scaler, scaler_path)
print(f"  Scaler: {scaler_path}")

# Feature isimleri ve konfigürasyon
config = {
    "scoring_features": SCORING_FEATURES,
    "knn_features": KNN_FEATURES,
    "target": TARGET,
    "xgb_metrics": {"mae": round(xgb_mae, 4), "rmse": round(xgb_rmse, 4), "r2": round(xgb_r2, 4)},
    "rf_metrics": {"mae": round(rf_mae, 4), "rmse": round(rf_rmse, 4), "r2": round(rf_r2, 4)},
    "best_model": "xgboost" if xgb_r2 > rf_r2 else "random_forest",
}

config_path = os.path.join(MODELS_DIR, "model_config.json")
with open(config_path, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print(f"  Config: {config_path}")

# ─────────────────────────────────────────────
# BÖLÜM 4: ÖRNEK TAHMİN (Inference Demo)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("BÖLÜM 4: ÖRNEK TAHMİN DEMO")
print("=" * 60)

# Senaryo: Yağlı ciltli bir kullanıcı, penalty_score=2 olan bir güneş kremini arıyor
demo_input = pd.DataFrame([{
    "skin_dry": 0, "skin_oily": 1, "skin_combination": 0, "skin_normal": 0,
    "ingredient_count": 22,
    "banned_count": 0, "restricted_count": 1, "penalty_score": 1,
    "good_for_dry": 1, "good_for_oily": 3, "good_for_acne": 2,
    "good_for_sensitive": 1, "good_for_pigmentation": 0, "good_for_aging": 1,
    "good_for_uv": 4, "good_for_barrier": 1, "good_for_radiance": 0,
    "good_for_texture": 1, "good_for_dark_circles": 0,
    "avoid_dry": 0, "avoid_oily": 0, "avoid_sensitive": 0,
    "avoid_combination": 0, "avoid_pregnancy": 0, "avoid_barrier": 0,
    "is_recommended": 1,
}])

xgb_score = xgb_model.predict(demo_input)[0]
rf_score = rf_model.predict(demo_input)[0]

print(f"  Senaryo: Yağlı ciltli kullanıcı, düşük penalty güneş kremi")
print(f"  XGBoost tahmini:       {xgb_score:.1f}/10")
print(f"  Random Forest tahmini: {rf_score:.1f}/10")

# Senaryo 2: Kuru ciltli kullanıcı, yüksek penalty'li parfüm
demo_input2 = pd.DataFrame([{
    "skin_dry": 1, "skin_oily": 0, "skin_combination": 0, "skin_normal": 0,
    "ingredient_count": 15,
    "banned_count": 5, "restricted_count": 8, "penalty_score": 23,
    "good_for_dry": 0, "good_for_oily": 0, "good_for_acne": 0,
    "good_for_sensitive": 0, "good_for_pigmentation": 0, "good_for_aging": 0,
    "good_for_uv": 0, "good_for_barrier": 0, "good_for_radiance": 0,
    "good_for_texture": 0, "good_for_dark_circles": 0,
    "avoid_dry": 1, "avoid_oily": 0, "avoid_sensitive": 1,
    "avoid_combination": 0, "avoid_pregnancy": 0, "avoid_barrier": 0,
    "is_recommended": 0,
}])

xgb_score2 = xgb_model.predict(demo_input2)[0]
rf_score2 = rf_model.predict(demo_input2)[0]

print(f"\n  Senaryo: Kuru ciltli kullanıcı, yüksek penalty parfüm")
print(f"  XGBoost tahmini:       {xgb_score2:.1f}/10")
print(f"  Random Forest tahmini: {rf_score2:.1f}/10")

print("\n" + "=" * 60)
print("TÜM MODELLER BAŞARIYLA EĞİTİLDİ VE KAYDEDİLDİ!")
print("=" * 60)
print(f"\nKaydedilen dosyalar:")
for f in os.listdir(MODELS_DIR):
    fpath = os.path.join(MODELS_DIR, f)
    size_mb = os.path.getsize(fpath) / (1024 * 1024)
    print(f"  {f} ({size_mb:.1f} MB)")
