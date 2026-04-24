# DerMind AI Server — TODO / Issues

Bu dosya eksikleri, hataları ve geliştirme önerilerini içerir.
README'ye yazılmaması için ayrı tutulmuştur.

---

## KRITIK — Sunucu Şu An Başlamıyor

### [ ] models/ klasöründe `xgboost_scoring_model.json` eksik
- `app.py` startup'ta `xgb_model.load_model(...)` çağırır, dosya yoksa hemen crash.
- Sadece `random_forest_scoring_model.pkl` var — XGBoost modeli git'e eklenmemiş veya `train_models_v2.py` ile yeniden üretilmesi gerekiyor.

### [ ] models/ klasöründe `model_config.json` eksik
- `app.py` ilk satırda bu dosyayı okur: `SCORING_FEATURES`, `KNN_FEATURES`, metrics.
- Dosya olmadan `CONFIG` set edilemez → tüm endpoint'ler çalışmaz.
- Oluşturulacak içerik: `{"scoring_features": [...], "knn_features": [...], "best_model": "xgboost", "version": "2.0", "total_products": 4692, "xgb_metrics": {"r2": 0.853}}`

---

## BUG — Yanlış Davranış

### [x] Cache key alerji bilgisini içermiyor (`/explain`) — DÜZELTİLDİ
- Satır 432-434: `f"{product_id}_{skin_type}_{has_acne}_{lang}"` — allergies dahil değil.
- Kullanıcı A (`allergies=["paraben"]`) ile kullanıcı B (`allergies=[]`) aynı cache'i paylaşır.
- Ancak `build_scoring_input` farklı `penalty_score` hesaplar → farklı SHAP değerleri → farklı açıklama olması gerekir.
- **Fix:** cache_key'e `"_".join(sorted(req.user.allergies))` ekle.

### [x] SHAP direction etiketleri dil bağımsız ("ARTIRAN"/"DUSUREN" hep Türkçe) — DÜZELTİLDİ
- Satır 426: `"direction": "ARTIRAN" if effect > 0 else "DUSUREN"` — dil kontrolü yok.
- İngilizce response içinde Türkçe etiketler çıkıyor.
- **Fix:** `"direction": ("INCREASES" if effect > 0 else "DECREASES") if req.language == "en" else ("ARTIRAN" if effect > 0 else "DUSUREN")`

### [ ] `is_recommended` her zaman 0.5 olarak hardcoded (`/score`, `/explain`)
- Satır 169: `row["is_recommended"] = 0.5`
- Bu feature SHAP'ta #1 sırada (1.3240 ortalama etki) — modelin en güçlü kolu.
- Backend'de `UserProductRating.wouldRecommend` field'ı var ama kullanılmıyor.
- **Fix:** Spring Boot'tan `is_recommended` parametresi geçilebilir, ya da ürünün mevcut ortalama öneri oranı `product_df`'den alınabilir.

### [ ] `/recommend` yüklenmiş KNN modelini kullanmıyor
- Satır 256: Her request'te `NearestNeighbors(...).fit(...)` yapılıyor — startup'ta yüklenen `knn_model` hiç kullanılmıyor.
- Kategori filtresi varken farklı `fit()` gerekebilir ama yine de gereksiz yük.
- **Fix:** Kategori filtresi yoksa `knn_model` direkt kullan. Filtreli sorguda yeniden fit etmek kaçınılmaz — ama o iş background thread'e alınabilir.

### [x] `call_llm` içindeki `if not llm_client` kontrolü dead code — KALDIRILDI
- Satır 376: `llm_client` hiçbir zaman `None` olamaz — startup'ta her zaman atanıyor.
- **Fix:** Satırı kaldır veya `isinstance` ile kontrol et.

### [x] `FEATURE_LABELS_TR` içinde `ingredient_count` key'i yok — EKLENDİ
- Satır 284-303: TR etiketler EN etiketlerden daha kısa, `ingredient_count` eksik.
- SHAP `ingredient_count` için etki hesaplarsa TR response'da raw feature adı görünür.
- **Fix:** `"ingredient_count": "toplam içerik sayısı"` ekle.

---

## EKSIK — Repo'da Bulunması Gereken Dosyalar

### [ ] `build_dataset_v2.py` — YOK
- README kurulum adımlarında `python build_dataset_v2.py` yazıyor ama dosya yok.
- Modelleri yeniden üretmek için bu dosya şart.

### [x] `train_models_v2.py` — OLUŞTURULDU
- Model eğitim pipeline'ı repo'da yok.
- XGBoost, RF, KNN, SHAP ve scaler'ı bu betik üretmeli.

### [ ] `seed_products.py` — YOK
- Ürünleri PostgreSQL'e aktaran betik yok.
- İlk kurulumda `dermind_knn_product_vectors.csv` → `products` tablosu için gerekli.

### [x] `.env.example` — OLUŞTURULDU
- Yeni developer `.env` ne yazacağını bilemiyor.
- İçerik:
  ```
  LLM_PROVIDER=ollama
  OLLAMA_HOST=http://localhost:11434
  OLLAMA_MODEL=llama3.1
  OPENAI_API_KEY=
  OPENAI_MODEL=gpt-4o-mini
  ```

### [x] `requirements.txt` — OLUŞTURULDU
- Bağımlılıklar sadece README'de metin olarak var — `pip install -r requirements.txt` çalışmıyor.
- **Fix:** `pip freeze > requirements.txt` veya elle oluştur.

### [ ] `dermind_synthetic_coldstart.csv` — YOK
- Cold start için üretilen 50K sentetik veri dosyası yok.
- `build_dataset_v2.py` yoksa bu dosya zaten üretilemez.

### [ ] `coldstart_model.json` — YOK
- README'de bahsedilen cold start pre-train modeli models/'da yok.

---

## GELİŞTİRME — Daha Profesyonel Yapılabilecekler

### [x] Startup model yükleme → lifespan context manager — YAPILDI
- Şu an modeller modül seviyesinde yükleniyor — import hatası durumunda stack trace belirsizleşiyor.
- **Fix:**
  ```python
  from contextlib import asynccontextmanager
  @asynccontextmanager
  async def lifespan(app):
      # startup
      load_models()
      yield
      # shutdown (temizlik)
  app = FastAPI(lifespan=lifespan)
  ```

### [ ] CPU-yoğun işlemler için `run_in_executor`
- `xgb_model.predict()`, `shap_explainer()` ve LLM çağrıları async FastAPI event loop'unu blokluyor.
- **Fix:** `loop.run_in_executor(None, predict_fn)` ile thread pool'a al.

### [ ] `/explain` cache için TTL ekle
- Şu an cache sonsuza kadar büyüyor (500'e kadar), girdi silinince yeniden doluyor.
- **Fix:** `cachetools.TTLCache(maxsize=500, ttl=3600)` kullan.

### [x] AI server için internal auth ekle — `INTERNAL_API_KEY` env var ile opsiyonel `X-Internal-Key` header desteği eklendi
- `/score`, `/recommend`, `/explain` şu an herkes tarafından çağrılabilir.
- **Fix:** Spring Boot ve AI server arasında shared secret (`X-Internal-Key` header).
  ```python
  from fastapi import Header, HTTPException
  async def verify_key(x_internal_key: str = Header(...)):
      if x_internal_key != os.getenv("INTERNAL_API_KEY"):
          raise HTTPException(status_code=403)
  ```

### [ ] Rate limiting ekle (özellikle /explain)
- LLM çağrısı hem yavaş hem para harcıyor (OpenAI). Korumasız.
- **Fix:** `slowapi` kütüphanesi ile `@limiter.limit("10/minute")`.

### [x] POST /score/batch endpoint ekle — YAPILDI (maks 50 ürün, partial error support)
- Şu an N ürün puanlamak için N ayrı HTTP call gerekiyor.
- **Fix:**
  ```python
  class BatchScoreRequest(BaseModel):
      product_ids: list[str]
      user: UserProfile
  @app.post("/score/batch")
  def score_batch(req: BatchScoreRequest): ...
  ```

### [ ] `streak_weight` parametresini `/score`'a ekle
- Model eğitiminde streak_weight kullanıldı ama inference'da bu bilgi kullanılmıyor.
- **Fix:** `ScoreRequest.streak_weight: float = 1.0` ekle, `build_scoring_input`'ta kullan.

### [x] Pydantic validator ile `skin_type` doğrula — `@field_validator` eklendi, geçersiz değer 422 döner
- Geçersiz değer sessizce "normal"'e fallback yapıyor — client hatayı görmez.
- **Fix:**
  ```python
  from pydantic import validator
  @validator("skin_type")
  def check_skin_type(cls, v):
      if v.lower() not in ("dry", "oily", "combination", "normal"):
          raise ValueError("skin_type must be dry|oily|combination|normal")
      return v.lower()
  ```

### [x] `print()` yerine proper logging — YAPILDI
- Startup mesajları `print()` ile yazılıyor — production'da log seviyesi yönetilemiyor.
- **Fix:** `import logging; logger = logging.getLogger(__name__)` ile değiştir.

### [x] CORS `allow_origins=["*"]` → production'da kısıtla — `ALLOWED_ORIGINS` env var ile yapılandırılabilir hale getirildi
- Development için sorun yok ama production deploy öncesi backend URL ile sınırlanmalı.
- **Fix:** `.env`'den `ALLOWED_ORIGINS` oku.

### [ ] pytest test suite ekle
- Şu an hiç test yok. En azından 4 endpoint için smoke test olmalı.
- **Fix:** `tests/test_endpoints.py` — mock CSV ve model ile `/score`, `/recommend`, `/explain`, `/health` test et.

---

## UZUN VADELİ — Continuous Learning

### [ ] Kullanıcı oylamalarını modele geri besleme
- README "Step 3: Continuous Learning" yazmış ama hiçbir şey yok.
- DerMind kullanıcılarının `UserProductRating` verileri zamanla biriktiğinde `train_models_v2.py`'yi yeniden çalıştırma planı yapılmalı.
- Düşünülecek: hangi threshold'da retrain tetiklenir (X yeni rating gelince?), model versioning nasıl olacak.
