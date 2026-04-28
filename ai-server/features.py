"""
DerMind AI — Ortak Feature Tanımları
======================================
Tek doğru kaynak (single source of truth) — train_models_v2.py ve app.py
buradaki listeleri import eder. Eğitimde kullanılan feature seti ile
inference'taki feature seti birbirinden ayrılmasın diye.
"""

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

# KNN recommendation — 24 boyutlu ürün uzayı
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

# Cilt tipi → one-hot encoding
SKIN_ONE_HOT = {
    "dry":         {"skin_dry": 1, "skin_oily": 0, "skin_combination": 0, "skin_normal": 0},
    "oily":        {"skin_dry": 0, "skin_oily": 1, "skin_combination": 0, "skin_normal": 0},
    "combination": {"skin_dry": 0, "skin_oily": 0, "skin_combination": 1, "skin_normal": 0},
    "normal":      {"skin_dry": 0, "skin_oily": 0, "skin_combination": 0, "skin_normal": 1},
}

VALID_SKIN_TYPES = set(SKIN_ONE_HOT.keys())
