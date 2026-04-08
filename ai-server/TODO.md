# DerMind AI — Yapilacaklar Listesi

> Son guncelleme: 2026-03-19
> Durum: AI Pipeline v2 tamamlandi (XGBoost R²=0.85, KNN, SHAP XAI, Cold Start)

---

## 1. AI Server API (Flask/FastAPI)
- [x] `ai-server/app.py` — FastAPI ile REST API yazildi
- [x] **POST /score** — Urun ID + kullanici profili → base_score + personal_score doner
- [x] **POST /recommend** — Kullanici profili + kategori → KNN ile top-5 urun onerisi
- [x] **POST /explain** — Urun ID + kullanici profili → SHAP degerleri + LLM prompt
- [x] Model dosyalarini yukleme (xgboost, knn, shap_explainer, scaler)
- [x] Hata yonetimi ve input validation
- [x] GET /health — sunucu saglik kontrolu

## 2. Backend Entegrasyonu (Spring Boot <-> AI Server)
- [ ] Backend'den AI server'a HTTP cagrisi (RestTemplate veya WebClient)
- [ ] Kullanici urun arattiginda → backend AI server'a istek atar → sonucu kullaniciya doner
- [ ] User entity'sindeki skin_type, allergies bilgileri AI server'a gonderilecek
- [ ] Streak entity'sindeki usage_days → streak_weight'e cevrilecek
- [ ] Product entity ile AI server'daki product_id eslesmesi saglanacak
- [ ] Timeout ve fallback mekanizmasi (AI server cevap vermezse default puan)

## 3. XAI + LLM Entegrasyonu
- [x] SHAP ciktisini OpenAI GPT'ye gonderen servis (app.py /explain)
- [x] Prompt template tasarimi (dermatolojik, nazik, maks 3 cumle)
- [x] OpenAI API key yonetimi (.env dosyasi, python-dotenv)
- [x] Response caching (MD5 hash: product_id+skin_type+language)
- [x] Turkce ve Ingilizce dil destegi (language: "tr" | "en")

## 4. Frontend Entegrasyonu (React Native / Mobile)
- [ ] Urun arama ekraninda base_score + personal_score gosterimi
- [ ] Puan gorsellestirme (renk kodlu: yesil 7+, sari 4-7, kirmizi 1-4)
- [ ] "Neden bu puan?" butonu → XAI aciklamasi popup/modal
- [ ] "Sana en uygun urunler" bolumu → KNN onerileri listesi
- [ ] Onboarding ekrani: cilt tipi, alerji, akne bilgisi toplama formu
- [ ] Streak gosterimi (kullanim gunu + guvenilirlik seviyesi)

## 5. Model Iyilestirme (Ileri Asama)
- [ ] Hyperparameter tuning (Optuna veya GridSearchCV)
- [ ] Daha fazla ingredient verisi (INCIDecoder/Skincarisma scraping)
- [ ] Continuous Learning: kullanici geri bildirimleriyle model retrain
- [ ] A/B test: XGBoost vs RF hangisi production'da daha iyi
- [ ] Feature engineering: yeni ozellikler (fiyat/performans orani, marka guvenilirligi)
- [ ] Model versiyonlama (MLflow veya basit json versioning)

## 6. Test & Validation
- [ ] AI Server unit testleri (tahmin dogrulugu, edge case'ler)
- [ ] Backend-AI entegrasyon testleri (end-to-end)
- [ ] Gercek senaryolarla manual test:
  - [ ] Yagli cilt + gunes kremi → yuksek puan beklenir
  - [ ] Kuru cilt + alkol iceren urun → dusuk puan beklenir
  - [ ] Alerjen madde iceren urun → cok dusuk puan beklenir
- [ ] Performans testi (API response suresi < 500ms hedef)

---

## Tamamlanan Isler

- [x] Sephora + CosIng + SkinCare veri birlestirme pipeline'i (build_dataset_v2.py)
- [x] Kategori filtreleme (Men, Tools, Mini, Hair, Fragrance cikarildi)
- [x] Base Score hesaplama (kullanicidan bagimsiz urun kalite puani)
- [x] Personalized Score (target_score) hesaplama
- [x] 50K satirlik sentetik Cold Start verisi uretimi
- [x] XGBoost model egitimi (R²=0.8530, MAE=0.3912)
- [x] Random Forest model egitimi (R²=0.8489, MAE=0.4039)
- [x] KNN oneri sistemi (4,692 urun, Cosine Similarity)
- [x] SHAP XAI entegrasyonu (TreeExplainer)
- [x] Streak weight sistemi (sample weighting)
- [x] 5-Fold Cross Validation (CV R²=0.8386)
- [x] Model kaydetme (xgboost json, rf pkl, knn pkl, shap pkl)
- [x] README.md dokumantasyonu
