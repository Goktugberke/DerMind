# DerMind

AI destekli kişiselleştirilmiş kozmetik öneri uygulaması.  
XGBoost skoru + KNN önerisi + SHAP/LLM açıklaması ile cilt tipine özel ürün değerlendirmesi yapar.

---

## Sistem Mimarisi

```
Mobile App / Web Client
         |
         v
Spring Boot Backend  :8080     <-- Google OAuth2, tüm iş mantığı, PostgreSQL
         |  HTTP (RestTemplate)
         v
FastAPI AI Server    :8000     <-- XGBoost, KNN, SHAP, Ollama/OpenAI
         |
         v
PostgreSQL           :5432
```

AI server çağrıları Spring Boot içindeki `AiController` → `AiServerClient` zinciriyle yapılır.  
AI server kapalıysa `AiController` 503 döner; istemci kendi fallback mantığını uygular.

---

## Gereksinimler

| Bileşen | Versiyon |
|---------|---------|
| Java | 21+ |
| Maven | 3.8+ |
| PostgreSQL | 14+ |
| Python | 3.10+ |
| Ollama | herhangi (llama3.1 modeli) |

---

## Ayağa Kaldırma

### 1. PostgreSQL

```bash
createdb dermind
```

### 2. AI Server

```bash
cd ai-server

# Bağımlılıklar (ilk kurulumda)
pip install fastapi "uvicorn[standard]" xgboost shap joblib pandas numpy scikit-learn openai python-dotenv

# .env dosyası (Ollama için değişiklik gerekmez)
cp .env.example .env

# Ürünleri DB'ye yükle — sadece ilk kurulumda
python seed_products.py

# Sunucuyu başlat
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Ollama kullanılıyorsa (varsayılan, ücretsiz):
```bash
ollama pull llama3.1    # ~4 GB, tek seferlik
```

OpenAI kullanmak için `.env` dosyasında:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### 3. Backend

`backend/src/main/resources/application.properties` dosyasını düzenle:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/dermind
spring.datasource.username=postgres
spring.datasource.password=postgres

spring.security.oauth2.client.registration.google.client-id=<GOOGLE_CLIENT_ID>
spring.security.oauth2.client.registration.google.client-secret=<GOOGLE_CLIENT_SECRET>

ai.server.url=http://localhost:8000
```

```bash
cd backend
mvn spring-boot:run
```

---

## Backend Endpoint'leri

Base URL: `http://localhost:8080`  
Kimlik doğrulama: Google OAuth2 (Spring Security OIDC session). `OAuth2` yazan endpoint'ler için oturum açık olmalı.

### Users — `/api/users`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| GET | `/api/users` | — | Tüm kullanıcılar |
| GET | `/api/users/{id}` | — | ID ile kullanıcı detayı |
| GET | `/api/users/me` | OAuth2 | Giriş yapan kullanıcının bilgileri |
| POST | `/api/users` | — | Kullanıcı oluştur |
| PUT | `/api/users/{id}` | — | Güncelle (name, allergens, skinType, hasAcne, picture) |
| DELETE | `/api/users/{id}` | — | Sil |
| GET | `/api/users/skin-type/{skinType}` | — | Cilt tipine göre filtrele |
| GET | `/api/users/search?name=` | — | İsme göre ara |

### Products — `/api/products`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| GET | `/api/products` | — | Tüm ürünler |
| GET | `/api/products/{id}` | — | Ürün detayı |
| POST | `/api/products` | — | Ürün ekle |
| PUT | `/api/products/{id}` | — | Ürün güncelle |
| DELETE | `/api/products/{id}` | — | Ürün sil |
| GET | `/api/products/search?q=` | — | Ad veya markada ara |
| GET | `/api/products/search/name?name=` | — | Sadece ada göre ara |
| GET | `/api/products/brand/{brand}` | — | Markaya göre listele |
| GET | `/api/products/top/quality?limit=10` | — | En yüksek kalite puanlı |
| GET | `/api/products/top/purchased?limit=10` | — | En çok satın alınan |
| GET | `/api/products/quality?min=7.0` | — | Min. kalite puanına göre filtrele |
| GET | `/api/products/recommendations/{userId}` | — | Yerel kural tabanlı öneri *(deprecated — AI endpoint'ini kullan)* |

### AI — `/api/ai`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| GET | `/api/ai/health` | — | AI server durumu (UP/DOWN) |
| GET | `/api/ai/score/{productId}` | OAuth2 | XGBoost base + kişisel puan |
| GET | `/api/ai/recommend` | OAuth2 | KNN ürün önerileri |
| GET | `/api/ai/explain/{productId}` | OAuth2 | SHAP + LLM açıklama |

**`/api/ai/recommend` parametreleri:**
- `category` — örn. `Skincare` (opsiyonel)
- `secondaryCategory` — örn. `Sunscreen`, `Moisturizers` (opsiyonel)
- `topK` — kaç öneri isteniyor (varsayılan `5`, maks `20`)

**`/api/ai/explain` parametreleri:**
- `language` — `tr` (Türkçe, varsayılan) veya `en`

> `/api/ai/explain` LLM çağrısı yapar; ilk istekte 5–30 saniye sürebilir.  
> Aynı `productId + skinType + language` kombinasyonu sonraki isteklerde cache'den döner (`"cached": true`).

**AI server kapalıysa:** tüm `/api/ai/*` endpoint'leri `503 Service Unavailable` döner.

### Purchases — `/api/purchases`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| POST | `/api/purchases` | OAuth2 | Satın alma oluştur |
| GET | `/api/purchases` | — | Tüm satın almalar |
| GET | `/api/purchases/my-purchases` | OAuth2 | Benim satın almalarım |
| GET | `/api/purchases/{id}` | — | Satın alma detayı |
| PUT | `/api/purchases/{id}` | — | Güncelle (durum, adres vb.) |
| DELETE | `/api/purchases/{id}` | — | Sil |

### Streaks — `/api/streaks`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| POST | `/api/streaks` | OAuth2 | Yeni ürün serisi başlat |
| GET | `/api/streaks/my-streaks` | OAuth2 | Benim serilerim |
| GET | `/api/streaks/{id}` | — | Seri detayı |
| PUT | `/api/streaks/{id}/use` | OAuth2 | Günlük kullanım kaydet + streak güncelle |
| DELETE | `/api/streaks/{id}` | — | Seri sil |

### Ratings — `/api/ratings`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| POST | `/api/ratings` | — | Rating oluştur |
| GET | `/api/ratings` | — | Tüm ratingler |
| GET | `/api/ratings/product/{productId}` | — | Ürüne ait ratingler |
| GET | `/api/ratings/user/{userId}` | — | Kullanıcının ratingler |
| GET | `/api/ratings/product/{productId}/stats` | — | Ürün rating istatistikleri |
| PUT | `/api/ratings/{id}` | — | Rating güncelle |
| DELETE | `/api/ratings/{id}` | — | Rating sil |

### Notifications — `/api/notifications`

| Method | Path | Auth | Açıklama |
|--------|------|:----:|----------|
| GET | `/api/notifications` | OAuth2 | Bildirimlerim |
| GET | `/api/notifications/unread-count` | OAuth2 | Okunmamış bildirim sayısı |
| PUT | `/api/notifications/{id}/read` | OAuth2 | Bildirimi okundu işaretle |
| PUT | `/api/notifications/read-all` | OAuth2 | Tümünü okundu işaretle |
| DELETE | `/api/notifications/{id}` | OAuth2 | Bildirimi sil |

---

## AI Server Endpoint'leri

Base URL: `http://localhost:8000`  
Swagger UI: `http://localhost:8000/docs`

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/health` | Sunucu ve model durumu |
| POST | `/score` | XGBoost kişisel puan (base + personal, 1–10) |
| POST | `/recommend` | KNN ürün önerileri (cosine similarity, k=10) |
| POST | `/explain` | SHAP TreeExplainer + LLM doğal dil açıklaması |

Detaylı request/response örnekleri ve curl komutları için [ai-server/README.md](ai-server/README.md) dosyasına bakın.

---

## Zamanlanmış Görevler (NotificationScheduler)

Backend her gün 5 cron job çalıştırır:

| Zaman | Görev |
|-------|-------|
| 08:00 | Sabah rutin hatırlatıcısı |
| 22:00 | Akşam rutin hatırlatıcısı |
| 12:00 | Streak uyarısı (o gün kullanılmamış seriler) |
| Pazar | Haftalık özet bildirimi |
| 00:01 | Streak sıfırlama (dün kullanılmayanlar) |

---

## Docs

`docs/` klasöründe üç HTML görselleştirme:

- [docs/uml_diagram.html](docs/uml_diagram.html) — Tüm entity, servis ve controller katmanı UML diyagramı
- [docs/flow_diagram.html](docs/flow_diagram.html) — Swim lane akış diyagramı (Auth → AI Engine → User Action)
- [docs/system_flow.html](docs/system_flow.html) — Sade sistem akış diyagramı

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | Spring Boot 3.5, Java 21, Spring Security OAuth2 |
| Veritabanı | PostgreSQL 14, Spring JPA/Hibernate |
| AI Server | Python 3.10, FastAPI, XGBoost, scikit-learn |
| Öneri | KNN (k=10, cosine similarity), 4,692 ürün |
| XAI | SHAP TreeExplainer + Ollama (llama3.1) / OpenAI |
| Kimlik | Google OAuth2 OIDC (`sub` claim = User.id) |
