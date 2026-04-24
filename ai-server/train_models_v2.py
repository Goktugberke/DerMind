#!/usr/bin/env python3
"""
DerMind AI — Model Eğitim Pipeline'ı
======================================
Çalıştırma:
  python train_models_v2.py
  python train_models_v2.py --skip-rf --skip-cv   # hızlı test (3-4 dk)
  python train_models_v2.py --models-dir /custom/path --seed 123

Çıktılar (models/ klasörü):
  xgboost_scoring_model.json       Ana puanlama modeli  (R²≈0.85)
  random_forest_scoring_model.pkl  RF baseline karşılaştırma
  knn_recommender_model.pkl        KNN öneri sistemi (tam katalog, k=10)
  shap_explainer.pkl               SHAP TreeExplainer (XAI)
  feature_scaler.pkl               KNN için StandardScaler
  model_config.json                Feature listesi + tüm metrikler

Gereksinimler:
  pip install -r requirements.txt
"""

import argparse
import json
import logging
import os
import sys
import time
import warnings
from contextlib import contextmanager

import joblib
import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("dermind-train")


# ─────────────────────────────────────────────
# FEATURE LİSTELERİ — app.py ile birebir eşleşmeli
# ─────────────────────────────────────────────

# XGBoost scoring model — build_scoring_input() bu listeyi kullanır
SCORING_FEATURES = [
    "skin_dry", "skin_oily", "skin_combination", "skin_normal",
    "rating", "is_recommended",
    "ingredient_count",
    "banned_count", "restricted_count", "penalty_score",
    "base_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv", "good_for_barrier",
    "good_for_radiance", "good_for_texture", "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
]

# KNN recommendation — 24 boyutlu ürün uzayı (app.py KNN_FEATURES ile eşleşmeli)
KNN_FEATURES = [
    "ingredient_count",
    "banned_count", "restricted_count", "penalty_score",
    "base_score",
    "good_for_dry", "good_for_oily", "good_for_acne", "good_for_sensitive",
    "good_for_pigmentation", "good_for_aging", "good_for_uv", "good_for_barrier",
    "good_for_radiance", "good_for_texture", "good_for_dark_circles",
    "avoid_dry", "avoid_oily", "avoid_sensitive", "avoid_combination",
    "avoid_pregnancy", "avoid_barrier",
    "rating", "price_usd",
]

TARGET_COL   = "target_score"
WEIGHT_COL   = "streak_weight"
SKIN_COL     = "skin_type"

# Sınıflandırma değerlendirmesi için puan aralıkları
SCORE_BINS   = [0, 4, 7, 10]
SCORE_LABELS = ["Dusuk (<4)", "Orta (4-7)", "Yuksek (7-10)"]

# ─────────────────────────────────────────────
# HİPERPARAMETRELER
# ─────────────────────────────────────────────

XGB_PARAMS = dict(
    objective        = "reg:squarederror",
    n_estimators     = 1000,       # early stopping ile gerçek sayı düşecek
    learning_rate    = 0.05,
    max_depth        = 6,
    min_child_weight = 3,
    subsample        = 0.8,
    colsample_bytree = 0.8,
    reg_alpha        = 0.1,
    reg_lambda       = 1.0,
    tree_method      = "hist",     # CPU'da en hızlı
    device           = "cpu",
    n_jobs           = -1,
    verbosity        = 0,
)
XGB_EARLY_STOP = 50    # N round iyileşme yoksa dur

RF_PARAMS = dict(
    n_estimators    = 200,
    max_depth       = None,
    min_samples_leaf= 5,
    n_jobs          = -1,
    random_state    = 42,
)


# ─────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────

@contextmanager
def timer(label: str):
    t0 = time.perf_counter()
    yield
    logger.info(f"    ⏱  {label}: {time.perf_counter() - t0:.1f}s")


def score_to_bucket(arr: np.ndarray) -> np.ndarray:
    return pd.cut(
        np.clip(arr, SCORE_BINS[0], SCORE_BINS[-1]),
        bins=SCORE_BINS, labels=SCORE_LABELS, include_lowest=True,
    ).astype(str)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2   = r2_score(y_true, y_pred)
    w05  = float(np.mean(np.abs(y_true - y_pred) <= 0.5) * 100)
    w1   = float(np.mean(np.abs(y_true - y_pred) <= 1.0) * 100)
    return {"mae": mae, "rmse": rmse, "r2": r2, "within_05": w05, "within_1": w1}


def print_metrics(m: dict, label: str = ""):
    prefix = f"[{label}] " if label else ""
    logger.info(
        f"    {prefix}"
        f"MAE={m['mae']:.4f}  RMSE={m['rmse']:.4f}  R²={m['r2']:.4f}  "
        f"±0.5: {m['within_05']:.1f}%  ±1.0: {m['within_1']:.1f}%"
    )


def print_classification_report(y_true: np.ndarray, y_pred: np.ndarray):
    y_true_cls = score_to_bucket(y_true)
    y_pred_cls = score_to_bucket(y_pred)
    report = classification_report(
        y_true_cls, y_pred_cls, labels=SCORE_LABELS, zero_division=0
    )
    logger.info(f"\n{report}")
    cm = confusion_matrix(y_true_cls, y_pred_cls, labels=SCORE_LABELS)
    header = f"{'':20s}" + "".join(f"  {lbl[:8]:>10}" for lbl in SCORE_LABELS)
    logger.info(f"  Confusion Matrix:\n  {header}")
    for row_label, row in zip(SCORE_LABELS, cm):
        logger.info(f"  {row_label:<20s}" + "".join(f"  {v:>10,}" for v in row))


def per_skin_metrics(
    df_ref: pd.DataFrame, y_pred: np.ndarray
) -> list[dict]:
    rows = []
    if SKIN_COL not in df_ref.columns:
        return rows
    for skin in ["dry", "oily", "combination", "normal"]:
        mask = (df_ref[SKIN_COL] == skin).values
        if mask.sum() == 0:
            continue
        y_t = df_ref.loc[mask, TARGET_COL].values
        y_p = y_pred[mask]
        mae = mean_absolute_error(y_t, y_p)
        logger.info(
            f"    {skin:<12s}  n={mask.sum():>7,}  MAE={mae:.4f}  "
            f"true_mean={y_t.mean():.2f}  pred_mean={y_p.mean():.2f}"
        )
        rows.append({
            "skin_type":  skin,
            "n":          int(mask.sum()),
            "mae":        round(float(mae), 4),
            "true_mean":  round(float(y_t.mean()), 2),
            "pred_mean":  round(float(y_p.mean()), 2),
        })
    return rows


def sep(title: str = ""):
    line = "─" * 60
    if title:
        logger.info(f"\n{line}\n  {title}\n{line}")
    else:
        logger.info(line)


# ─────────────────────────────────────────────
# ANA PIPELINE
# ─────────────────────────────────────────────

def main(base_dir: str, models_dir: str, seed: int, skip_rf: bool, skip_cv: bool):
    os.makedirs(models_dir, exist_ok=True)
    np.random.seed(seed)
    pipeline_start = time.perf_counter()

    # ─── 1. VERİ YÜKLEME ───────────────────────────────────────
    sep("ADIM 1 — Veri Yükleme")

    train_csv   = os.path.join(base_dir, "dermind_ai_training_dataset.csv")
    product_csv = os.path.join(base_dir, "dermind_knn_product_vectors.csv")

    for path, label in [(train_csv, "eğitim"), (product_csv, "ürün vektörü")]:
        if not os.path.exists(path):
            logger.error(f"  {label} dosyası bulunamadı: {path}")
            logger.error("  Önce build_dataset_v2.py çalıştırın.")
            sys.exit(1)

    with timer("CSV yükleme"):
        df_train   = pd.read_csv(train_csv)
        df_product = pd.read_csv(product_csv)

    logger.info(f"  Eğitim seti : {len(df_train):>10,} satır  x  {df_train.shape[1]} kolon")
    logger.info(f"  Ürün vektörü: {len(df_product):>10,} ürün   x  {df_product.shape[1]} kolon")

    # ─── 2. VERİ DOĞRULAMA ─────────────────────────────────────
    sep("ADIM 2 — Veri Doğrulama")

    errors = []
    for col in SCORING_FEATURES:
        if col not in df_train.columns:
            errors.append(f"Eğitim verisinde eksik scoring feature: '{col}'")
    for col in KNN_FEATURES:
        if col not in df_product.columns:
            errors.append(f"Ürün verisinde eksik KNN feature: '{col}'")
    if TARGET_COL not in df_train.columns:
        errors.append(f"Hedef kolon '{TARGET_COL}' bulunamadı")
    if errors:
        for e in errors:
            logger.error(f"  ✗ {e}")
        sys.exit(1)

    # NaN temizliği
    nan_target = int(df_train[TARGET_COL].isna().sum())
    if nan_target > 0:
        logger.warning(f"  NaN hedef: {nan_target:,} satır kaldırılıyor")
        df_train = df_train.dropna(subset=[TARGET_COL]).reset_index(drop=True)

    nan_score_feats = int(df_train[SCORING_FEATURES].isna().sum().sum())
    nan_knn_feats   = int(df_product[KNN_FEATURES].isna().sum().sum())
    if nan_score_feats:
        logger.warning(f"  NaN scoring feature: {nan_score_feats:,} → 0 dolduruldu")
    if nan_knn_feats:
        logger.warning(f"  NaN KNN feature: {nan_knn_feats:,} → 0 dolduruldu")

    df_train[SCORING_FEATURES]   = df_train[SCORING_FEATURES].fillna(0)
    df_product[KNN_FEATURES]     = df_product[KNN_FEATURES].fillna(0)

    has_weight  = WEIGHT_COL in df_train.columns
    has_skintype = SKIN_COL in df_train.columns
    if not has_weight:
        logger.warning(f"  '{WEIGHT_COL}' kolonu yok — tüm örnekler eşit ağırlıklı")
        df_train[WEIGHT_COL] = 1.0

    t = df_train[TARGET_COL]
    logger.info(
        f"  Hedef dağılımı: min={t.min():.2f}  max={t.max():.2f}  "
        f"mean={t.mean():.2f}  std={t.std():.2f}  median={t.median():.2f}"
    )
    logger.info("  Doğrulama: ✓ GEÇTI")

    # ─── 3. TRAIN / VAL / TEST BÖLME ───────────────────────────
    sep("ADIM 3 — Train / Val / Test Bölme  (70 / 15 / 15)")

    X = df_train[SCORING_FEATURES].values.astype(np.float32)
    y = df_train[TARGET_COL].values.astype(np.float32)
    w = df_train[WEIGHT_COL].values.astype(np.float32)

    # İlk bölme: test %15
    X_tmp, X_test, y_tmp, y_test, w_tmp, w_test, idx_tmp, idx_test = train_test_split(
        X, y, w, np.arange(len(df_train)),
        test_size=0.15, random_state=seed,
    )
    # İkinci bölme: kalan içinden val %15 (= toplam %15)
    val_frac = 0.15 / 0.85
    X_train, X_val, y_train, y_val, w_train, w_val, idx_train, idx_val = train_test_split(
        X_tmp, y_tmp, w_tmp, idx_tmp,
        test_size=val_frac, random_state=seed,
    )

    n_total = len(X)
    logger.info(f"  Train : {len(X_train):>8,}  ({len(X_train)/n_total*100:.1f}%)")
    logger.info(f"  Val   : {len(X_val):>8,}  ({len(X_val)/n_total*100:.1f}%)")
    logger.info(f"  Test  : {len(X_test):>8,}  ({len(X_test)/n_total*100:.1f}%)")

    # Test için orijinal satırları saklıyoruz (skin_type erişimi)
    df_test_rows = df_train.iloc[idx_test].reset_index(drop=True)

    # ─── 4. XGBOOST EĞİTİMİ ────────────────────────────────────
    sep("ADIM 4 — XGBoost Eğitimi  (early stopping)")

    xgb_model = xgb.XGBRegressor(
        **XGB_PARAMS,
        random_state=seed,
        early_stopping_rounds=XGB_EARLY_STOP,
    )

    xgb_fit_params = dict(
        X=X_train,
        y=y_train,
        sample_weight=w_train,
        eval_set=[(X_val, y_val)],
        verbose=100,    # her 100 round'da bir log
    )

    with timer("XGBoost fit"):
        xgb_model.fit(**xgb_fit_params)

    best_iter = int(xgb_model.best_iteration) if xgb_model.best_iteration is not None else -1
    best_val  = float(xgb_model.best_score)   if xgb_model.best_score     is not None else -1.0
    logger.info(f"  En iyi iterasyon : {best_iter}")
    logger.info(f"  En iyi val RMSE  : {best_val:.4f}")

    logger.info("  >> Validation:")
    y_pred_val  = xgb_model.predict(X_val)
    xgb_val_m   = regression_metrics(y_val, y_pred_val)
    print_metrics(xgb_val_m, "XGB-Val")

    logger.info("  >> Test:")
    y_pred_test  = xgb_model.predict(X_test)
    xgb_test_m   = regression_metrics(y_test, y_pred_test)
    print_metrics(xgb_test_m, "XGB-Test")

    logger.info("  >> Cilt tipine göre Test MAE:")
    skin_metrics = per_skin_metrics(df_test_rows, y_pred_test)

    logger.info("  >> Sınıflandırma Raporu (Test):")
    print_classification_report(y_test, y_pred_test)

    # 5-fold Cross-Validation
    cv_r2_mean, cv_r2_std = None, None
    if not skip_cv:
        logger.info("  >> 5-Fold Cross-Validation (tüm veri, sabit n_estimators)...")
        n_est = best_iter if best_iter > 0 else 500
        cv_model = xgb.XGBRegressor(
            **{k: v for k, v in XGB_PARAMS.items() if k != "n_estimators"},
            n_estimators=n_est,
            random_state=seed,
        )
        with timer("5-fold CV"):
            cv_scores = cross_val_score(cv_model, X, y, cv=5, scoring="r2", n_jobs=-1)
        cv_r2_mean = float(cv_scores.mean())
        cv_r2_std  = float(cv_scores.std())
        logger.info(
            f"  CV R²: {cv_r2_mean:.4f} ± {cv_r2_std:.4f}  "
            f"fold değerleri: {[round(float(s), 4) for s in cv_scores]}"
        )
    else:
        logger.info("  5-fold CV atlandı (--skip-cv).")

    # ─── 5. RANDOM FOREST BASELINE ─────────────────────────────
    rf_test_m = None
    rf_model  = None
    if not skip_rf:
        sep("ADIM 5 — Random Forest Baseline")
        rf_model = RandomForestRegressor(**{**RF_PARAMS, "random_state": seed})
        with timer("RF fit"):
            rf_model.fit(X_train, y_train, sample_weight=w_train)
        y_pred_rf = rf_model.predict(X_test)
        rf_test_m = regression_metrics(y_test, y_pred_rf)
        print_metrics(rf_test_m, "RF-Test")
        logger.info(
            f"  Karşılaştırma — R²:  XGBoost={xgb_test_m['r2']:.4f}  "
            f"RF={rf_test_m['r2']:.4f}  "
            f"(fark: {xgb_test_m['r2'] - rf_test_m['r2']:+.4f})"
        )
    else:
        logger.info("\nADIM 5 — Random Forest atlandı (--skip-rf).")

    # ─── 6. KNN EĞİTİMİ ────────────────────────────────────────
    sep("ADIM 6 — KNN Tam Katalog  (k=10, cosine, StandardScaler)")

    knn_X_raw = df_product[KNN_FEATURES].values.astype(np.float32)

    scaler = StandardScaler()
    with timer("StandardScaler fit"):
        knn_X_scaled = scaler.fit_transform(knn_X_raw)

    knn_model = NearestNeighbors(
        n_neighbors=10, metric="cosine", algorithm="brute", n_jobs=-1
    )
    with timer("KNN fit"):
        knn_model.fit(knn_X_scaled)

    # Basit doğrulama: ilk ürünün en yakın komşularını bul
    test_vec   = knn_X_scaled[:1]
    dists, ids = knn_model.kneighbors(test_vec, n_neighbors=5)
    logger.info(f"  KNN doğrulama — ilk ürün '{df_product.iloc[0]['product_name'][:40]}'")
    logger.info(f"  En yakın 5 ürün (cosine dist): {[round(float(d), 4) for d in dists[0]]}")
    logger.info(f"  KNN eğitildi: {len(df_product):,} ürün, {len(KNN_FEATURES)} özellik")

    # ─── 7. SHAP TreeExplainer ─────────────────────────────────
    sep("ADIM 7 — SHAP TreeExplainer")

    with timer("TreeExplainer oluşturma"):
        shap_explainer = shap.TreeExplainer(xgb_model)

    shap_sample = min(3000, len(X_test))
    X_shap      = pd.DataFrame(X_test[:shap_sample], columns=SCORING_FEATURES)
    with timer(f"SHAP değerleri ({shap_sample} örnek)"):
        shap_vals = shap_explainer(X_shap)

    mean_abs = np.abs(shap_vals.values).mean(axis=0)
    shap_importance = sorted(
        zip(SCORING_FEATURES, mean_abs.tolist()),
        key=lambda x: x[1],
        reverse=True,
    )
    logger.info("  Top-10 SHAP Feature Importance:")
    for rank, (feat, imp) in enumerate(shap_importance[:10], 1):
        bar = "█" * int(imp * 30 / shap_importance[0][1])
        logger.info(f"    {rank:2d}. {feat:<30s} {imp:.4f}  {bar}")

    # ─── 8. MODEL KAYDETME ─────────────────────────────────────
    sep("ADIM 8 — Dosyalar Kaydediliyor")

    xgb_path    = os.path.join(models_dir, "xgboost_scoring_model.json")
    rf_path     = os.path.join(models_dir, "random_forest_scoring_model.pkl")
    knn_path    = os.path.join(models_dir, "knn_recommender_model.pkl")
    scaler_path = os.path.join(models_dir, "feature_scaler.pkl")
    shap_path   = os.path.join(models_dir, "shap_explainer.pkl")
    cfg_path    = os.path.join(models_dir, "model_config.json")

    xgb_model.save_model(xgb_path)
    logger.info(f"  ✓ {xgb_path}")

    if rf_model is not None:
        joblib.dump(rf_model, rf_path, compress=3)
        logger.info(f"  ✓ {rf_path}")

    joblib.dump(knn_model, knn_path, compress=3)
    logger.info(f"  ✓ {knn_path}")

    joblib.dump(scaler, scaler_path, compress=3)
    logger.info(f"  ✓ {scaler_path}")

    joblib.dump(shap_explainer, shap_path, compress=3)
    logger.info(f"  ✓ {shap_path}")

    config = {
        "version":           "2.0",
        "best_model":        "xgboost",
        "total_products":    len(df_product),
        "scoring_features":  SCORING_FEATURES,
        "knn_features":      KNN_FEATURES,
        "xgb_best_iteration": best_iter,
        "xgb_metrics": {
            "val_rmse":       round(best_val, 4),
            "mae":            round(xgb_test_m["mae"],      4),
            "rmse":           round(xgb_test_m["rmse"],     4),
            "r2":             round(xgb_test_m["r2"],       4),
            "within_05_pct":  round(xgb_test_m["within_05"], 2),
            "within_1_pct":   round(xgb_test_m["within_1"],  2),
            "cv_r2_mean":     round(cv_r2_mean, 4) if cv_r2_mean is not None else None,
            "cv_r2_std":      round(cv_r2_std,  4) if cv_r2_std  is not None else None,
        },
        "rf_metrics": {
            "mae":  round(rf_test_m["mae"],  4),
            "rmse": round(rf_test_m["rmse"], 4),
            "r2":   round(rf_test_m["r2"],   4),
        } if rf_test_m else None,
        "shap_top10": [
            {"feature": f, "mean_abs_shap": round(float(v), 4)}
            for f, v in shap_importance[:10]
        ],
        "per_skin_mae":  skin_metrics,
        "data_splits": {
            "train": len(X_train),
            "val":   len(X_val),
            "test":  len(X_test),
        },
        "hyperparameters": {
            "xgboost": XGB_PARAMS,
            "random_forest": RF_PARAMS if not skip_rf else None,
            "knn": {"k": 10, "metric": "cosine"},
        },
        "random_seed": seed,
    }
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    logger.info(f"  ✓ {cfg_path}")

    # ─── 9. ÖZET ───────────────────────────────────────────────
    elapsed = time.perf_counter() - pipeline_start
    sep("EĞİTİM TAMAMLANDI")

    r2_ok  = xgb_test_m["r2"]  >= 0.80
    mae_ok = xgb_test_m["mae"] <= 0.50

    logger.info(f"  Toplam süre      : {elapsed / 60:.1f} dakika")
    logger.info(f"  XGBoost R²       : {xgb_test_m['r2']:.4f}   {'✓' if r2_ok  else '✗'} (hedef ≥ 0.80)")
    logger.info(f"  XGBoost MAE      : {xgb_test_m['mae']:.4f}   {'✓' if mae_ok else '✗'} (hedef ≤ 0.50)")
    logger.info(f"  XGBoost RMSE     : {xgb_test_m['rmse']:.4f}")
    if cv_r2_mean is not None:
        logger.info(f"  5-Fold CV R²     : {cv_r2_mean:.4f} ± {cv_r2_std:.4f}")
    logger.info(f"  KNN ürün sayısı  : {len(df_product):,}")
    logger.info(f"  Çıktı klasörü    : {os.path.abspath(models_dir)}")

    if r2_ok and mae_ok:
        logger.info("\n  🎯 Tüm tez hedefleri karşılandı.")
    else:
        logger.warning("\n  ⚠  Bir veya daha fazla tez hedefi karşılanamadı.")


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="DerMind AI — XGBoost + KNN + SHAP eğitim pipeline'ı",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--data-dir", default=".",
        help="dermind_ai_training_dataset.csv ve dermind_knn_product_vectors.csv klasörü",
    )
    parser.add_argument(
        "--models-dir", default="models",
        help="Model çıktı klasörü",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Rastgelelik tohumu (reproducibility)",
    )
    parser.add_argument(
        "--skip-rf", action="store_true",
        help="Random Forest eğitimini atla (hızlı test: ~3-4 dk)",
    )
    parser.add_argument(
        "--skip-cv", action="store_true",
        help="5-fold cross-validation'ı atla (hızlı test: ~3-4 dk)",
    )
    args = parser.parse_args()
    main(
        base_dir   = args.data_dir,
        models_dir = args.models_dir,
        seed       = args.seed,
        skip_rf    = args.skip_rf,
        skip_cv    = args.skip_cv,
    )
