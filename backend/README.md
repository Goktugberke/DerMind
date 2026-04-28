# DerMind Backend

Spring Boot tabanlı REST API — kullanıcı yönetimi, ürün kataloğu, satın alma, streak, bildirim ve AI server proxy katmanı.
**Spring Boot 3.5 · PostgreSQL · Firebase Auth · JPA · Bucket4j · Micrometer Tracing (OTel)**

---

## İçindekiler

1. [Mimari](#mimari)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Kurulum (Lokal)](#kurulum-lokal)
4. [Kurulum (Docker Compose)](#kurulum-docker-compose)
5. [Ortam Değişkenleri](#ortam-değişkenleri)
6. [API Endpointleri](#api-endpointleri)
7. [AI Server Entegrasyonu](#ai-server-entegrasyonu)
8. [Rate Limiting](#rate-limiting)
9. [Distributed Tracing](#distributed-tracing-opentelemetry)
10. [Testler](#testler)
11. [Proje Yapısı](#proje-yapısı)

---

## Mimari

```
┌───────────────────────────────────────────────────────────────┐
│                      DerMind Sistemi                          │
│                                                               │
│  Mobil Uygulama / Frontend                                    │
│       │  Authorization: Bearer <Firebase ID Token>            │
│       ▼                                                       │
│  Spring Boot Backend (:8080)                                  │
│  ├── FirebaseTokenFilter   → her istekte token doğrular       │
│  ├── RateLimitFilter       → IP başı bucket (60 req/dk)       │
│  ├── UserController        → /api/users                       │
│  ├── ProductController     → /api/products  (paginated)       │
│  ├── AiController          → /api/ai  (proxy + auth)          │
│  ├── PurchaseController    → /api/purchases                   │
│  ├── StreakController      → /api/streaks                     │
│  ├── FavoriteController    → /api/favorites                   │
│  ├── CartController        → /api/cart                        │
│  ├── NotificationController → /api/notifications              │
│  └── UserProductRatingController → /api/ratings               │
│       │                      │                                │
│       ▼                      ▼ X-Internal-Key                 │
│  PostgreSQL (:5432)    AI Server (:8000)                      │
│  (JPA/Hibernate)       (FastAPI — XGBoost/KNN/SHAP)           │
└───────────────────────────────────────────────────────────────┘
```

**Kimlik doğrulama:** Firebase ID token (Google login + email/şifre + telefon). Token `Authorization: Bearer <token>` header'ı ile gelir, `FirebaseTokenFilter` doğrular ve `SecurityContext`'e yerleştirir.

**AI server entegrasyonu:** Backend, AI server'a `X-Internal-Key` shared secret ile gider. Frontend doğrudan AI server'ı çağıramaz — proxy üzerinden geçmek zorundadır (güvenlik açığı önlenir).

---

## Hızlı Başlangıç

### Docker Compose ile (önerilen)

```bash
cd backend
cp .env.example .env
# .env içinde POSTGRES_USER, POSTGRES_PASSWORD, AI_SERVER_INTERNAL_KEY doldur

docker compose up --build
```

| Servis | URL |
|--------|-----|
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| AI Server | http://localhost:8000 |
| AI Swagger | http://localhost:8000/docs |
| Frontend | http://localhost:80 |

```bash
docker compose down          # konteynerları durdur
docker compose down -v       # konteynerları + DB hacmini sil
```

---

## Kurulum (Lokal)

### Gereksinimler

- Java 21+
- Maven 3.9+ (ya da `./mvnw`)
- PostgreSQL 15+
- Firebase projesi + service account JSON

### 1. PostgreSQL'i Hazırla

```bash
docker run -d \
  --name dermind-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dermind \
  -p 5432:5432 \
  postgres:15
```

### 2. Firebase Service Account

[Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts → "Generate new private key" → JSON dosyasını `backend/firebase-service-account.json` olarak kaydet (git'te ignore'lı).

### 3. Uygulamayı Başlat

```bash
./mvnw spring-boot:run
# veya
./mvnw package -DskipTests && java -jar target/DerMind-0.0.1-SNAPSHOT.jar
```

```
Started DerMindApplication in X.XXX seconds
```

### 4. Veritabanı Şeması

Uygulama `spring.jpa.hibernate.ddl-auto=update` ile çalışır — tabloları otomatik oluşturur (`products`, `users`, `purchases`, `streaks`, `notifications`, `user_product_ratings`, `favorites`, `cart_items`).

### 5. Ürünleri Yükle (isteğe bağlı, ama AI puanlama için zorunlu)

```bash
cd ../ai-server
python seed_products.py --backend-url http://localhost:8080
# Önce dry-run
python seed_products.py --dry-run
```

---

## Kurulum (Docker Compose)

`compose.yaml` dört servisi yönetir:

| Servis | Port | Bağımlılık |
|--------|------|-----------|
| `postgres` | 5432 | — |
| `ai-server` | 8000 | — |
| `backend` | 8080 | postgres (healthy) + ai-server (healthy) |
| `frontend` | 80 | — |

Backend, AI sunucusu hazır olmadan başlamaz (`depends_on: condition: service_healthy`). `AI_SERVER_URL=http://ai-server:8000` ortam değişkeni ile iç ağdan bağlanır.

### .env Dosyası

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=guclu_bir_sifre

# AI server ile shared secret — boş bırakılırsa auth devre dışı (development için OK)
AI_SERVER_INTERNAL_KEY=ortak-gizli-anahtar
```

> **Not:** `firebase-service-account.json` dosyası backend'in çalışma dizinine kopyalanmalı (Dockerfile bind mount kullanır).

---

## Ortam Değişkenleri

Spring Boot relaxed binding: `AI_SERVER_URL` env → `ai.server.url` property.

| Değişken | Varsayılan | Açıklama |
|----------|-----------|---------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/dermind` | PostgreSQL URL |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | |
| `SPRING_DATASOURCE_PASSWORD` | `postgres` | |
| `AI_SERVER_URL` | `http://localhost:8000` | AI sunucusu adresi |
| `AI_SERVER_INTERNAL_KEY` | — | AI server `INTERNAL_API_KEY` ile aynı olmalı |
| `RATELIMIT_PRODUCT_DETAIL_REQUESTS_PER_MINUTE` | `60` | `GET /api/products/{id}` IP başı limit |
| `MANAGEMENT_OTLP_TRACING_ENDPOINT` | — | Boş = tracing devre dışı |
| `MANAGEMENT_TRACING_SAMPLING_PROBABILITY` | `1.0` | 0.0–1.0 |

---

## API Endpointleri

Swagger UI: `http://localhost:8080/swagger-ui.html`

### Kimlik Doğrulama

| Endpoint | Auth | Açıklama |
|----------|------|---------|
| `GET /` | Hayır | Ana sayfa |
| `POST /api/users/firebase` | Hayır | Firebase token doğrulama + kullanıcı kaydı |
| `POST /api/users` | Hayır | Manuel kayıt |
| `GET /api/users/email/**` | Hayır | Email lookup |
| `GET /api/products/**` | Hayır | Ürün listesi (anonim erişim) |
| `GET /api/ratings/**` | Hayır | Public rating'ler |
| `GET /api/ai/health` | Hayır | AI server sağlık kontrolü |
| `GET /actuator/health` | Hayır | Backend sağlık |
| Diğer tüm `/api/**` | **Bearer token** | Firebase ID token gerekli |

---

### Ürünler — `/api/products`

Tüm liste endpointleri **paginated** (`Page<>`): `?page=0&size=20&sort=name,asc`.

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/api/products` | Tüm ürünler (paginated) |
| GET | `/api/products/{id}` | ID ile ürün + AI personal_score |
| POST | `/api/products` | Yeni ürün oluştur |
| PUT | `/api/products/{id}` | Güncelle |
| DELETE | `/api/products/{id}` | Sil |
| GET | `/api/products/search?query={terim}` | Ad/marka ara (paginated) |
| GET | `/api/products/brand/{marka}` | Markaya göre filtrele |
| GET | `/api/products/quality?min={puan}` | Kalite puanı |
| GET | `/api/products/filter?...` | Çoklu filtre (price, quality, search) |
| GET | `/api/products/top/quality?limit=10` | En kaliteli |
| GET | `/api/products/top/purchased?limit=10` | En çok satılan |
| GET | `/api/products/recommendations/{userId}` | Basit kural-tabanlı öneri |

**`GET /api/products/{id}` özel davranış:**
Authenticated kullanıcı → AI server'a `is_recommended` (UserProductRating ortalaması) ile gider, response'taki `personalScore` AI'dan gelir.
Anonymous → `personalScore = qualityScore` fallback.

**POST /api/products:**

```json
{
  "name": "Barrier Moisture Cream",
  "brand": "COSRX",
  "ingredients": "Contains 24 ingredients...",
  "qualityScore": 8.5,
  "sephoraProductId": "P123456",
  "baseScore": 8.2,
  "price": 38.0,
  "category": "Skincare",
  "secondaryCategory": "Moisturizers",
  "sephoraRating": 4.6
}
```

> Backend artık `priceUsd` değil **`price`** kullanır (eski seed script'leri güncellendi).

---

### Kullanıcılar — `/api/users`

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| POST | `/api/users/firebase` | Firebase token → kullanıcı kayıt/giriş |
| GET | `/api/users` | Tümü |
| GET | `/api/users/{id}` | Detay |
| GET | `/api/users/me` | Authenticated kullanıcı |
| GET | `/api/users/email/{email}` | Email ile lookup |
| PUT | `/api/users/{id}` | Profil (skinType, allergens, hasAcne, picture) |
| DELETE | `/api/users/{id}` | Sil |

---

### AI Proxy — `/api/ai`

Backend, AI sunucusuna proxy görevi görür. Mobil bu endpointleri Firebase token ile çağırır; backend kullanıcıyı email üzerinden bulur, profili hazırlar ve `X-Internal-Key` ile AI'ya iletir.

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/api/ai/health` | AI server durumu (auth gerektirmez) |
| GET | `/api/ai/score/{productId}` | XGBoost puanı + allergen warnings |
| GET | `/api/ai/recommend?category=X&secondaryCategory=Y&topK=5` | KNN öneriler |
| GET | `/api/ai/explain/{productId}?language=tr` | SHAP + LLM açıklaması |

```bash
curl http://localhost:8080/api/ai/health
```

```json
{ "ai_server_status": "UP", "ai_server_url": "http://localhost:8000" }
```

AI sunucusu erişilemezse `/api/ai/score`, `/recommend`, `/explain` → `HTTP 503`.

---

### Diğer Modüller

| Prefix | Açıklama |
|--------|---------|
| `/api/purchases` | Satın alma geçmişi |
| `/api/streaks` | Kullanım serisi takibi |
| `/api/ratings` | Kullanıcı ürün değerlendirmeleri (`wouldRecommend` AI'ya beslenir) |
| `/api/favorites` | Favori ürünler |
| `/api/cart` | Sepet |
| `/api/notifications` | Bildirim yönetimi |

---

## AI Server Entegrasyonu

İki ayrı client var:

```
ProductService.getProductById()  ──┐
                                   ├─→ AiServiceClient (X-Internal-Key)  ──→ POST /score
                                   │   ProductService → tek-amaçlı, recommend rate hesaplı
                                   │
AiController.getScore/recommend/  ─┴─→ AiServerClient (X-Internal-Key)   ──→ POST /score
explain                                AiController → proxy, mobil için      POST /recommend
                                                                              POST /explain
                                       45sn read timeout (LLM)
```

**Önemli detaylar:**

- `Product.sephoraProductId` boş olan ürünler AI puanı alamaz (HTTP 400).
- `AiServiceClient`, ürünün `UserProductRating.wouldRecommend` ortalamasını **`is_recommended`** olarak iletir → modelin SHAP #1 feature'ı (etki ≈ 1.32).
- `User.hasAcne` ve `User.allergens` artık doğru iletilir (önceden `has_acne` hardcoded `false`'tu).
- Her iki client da `X-Internal-Key` header gönderir — AI server `INTERNAL_API_KEY` aktifken çalışır.
- AI server null döndüğünde `personalScore` → `qualityScore` fallback.

**RestTemplate timeout** (`AppConfig.java`):
- `restTemplate` (default): connect 3sn, read 10sn
- `aiRestTemplate` (AI proxy için): connect 3sn, read **45sn** — `/explain` LLM çağrısı 30sn'ye kadar sürebilir

---

## Rate Limiting

`RateLimitFilter` (Bucket4j, IP başı per-minute bucket). Sadece **AI maliyeti olan endpoint'leri** sınırlar:

| Endpoint | Default | Override |
|----------|---------|----------|
| `GET /api/products/{id}` (AI çağrısı tetikler) | 60 req/dk | `RATELIMIT_PRODUCT_DETAIL_REQUESTS_PER_MINUTE` |

Listing/search etkilenmez. Limit aşılırsa `HTTP 429`:

```json
{ "errorCode": "RATE_LIMIT_EXCEEDED", "message": "Too many requests, please retry later." }
```

> AI server tarafında ikinci katman: slowapi ile `/score` 60/dk, `/recommend` 30/dk, `/explain` 10/dk.

---

## Distributed Tracing (OpenTelemetry)

`micrometer-tracing-bridge-otel` + `opentelemetry-exporter-otlp` ile aktif edilir.

```env
MANAGEMENT_OTLP_TRACING_ENDPOINT=http://localhost:4317
MANAGEMENT_TRACING_SAMPLING_PROBABILITY=1.0
```

Spring Boot tracing **otomatik**:
- HTTP request'leri (servlet filter)
- JDBC sorguları
- `RestTemplate` çağrıları → AI server'a giderken trace ID propagate edilir

AI server tarafında `OTEL_ENABLED=true` ise aynı OTLP collector'a span gönderir → **cross-service trace**: tek bir `traceId` ile mobile → backend → AI → LLM yolculuğu görünür.

```bash
# Jaeger ile lokal test
docker run -d -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one:latest
open http://localhost:16686
```

---

## Testler

```bash
./mvnw test
./mvnw test -Dtest=ProductControllerTest
./mvnw test jacoco:report   # target/site/jacoco/index.html
```

**Test profili** (`application-test.properties`):
- H2 in-memory veritabanı
- Docker Compose devre dışı

**Mevcut testler:**

| Sınıf | Tip | Test Sayısı |
|-------|-----|-------------|
| `ProductControllerTest` | `@WebMvcTest` (paginated API + Firebase) | 9 |
| `AiControllerTest` | `@WebMvcTest` | 7 |
| `AiServerClientTest` | Birim (Mockito) | 7 |
| **Toplam** | | **23** |

---

## Proje Yapısı

```
backend/
├── Dockerfile                  ← Multi-stage Maven + JRE
├── compose.yaml                ← postgres + ai-server + backend + frontend
├── pom.xml                     ← Spring Boot 3.5, Lombok, TestContainers, H2,
│                                  Bucket4j, Micrometer Tracing OTel
└── src/
    ├── main/
    │   ├── java/com/dermind/DerMind/
    │   │   ├── DerMindApplication.java
    │   │   ├── HomeController.java
    │   │   ├── ai/
    │   │   │   ├── controller/AiController.java       ← /api/ai proxy (Firebase auth)
    │   │   │   ├── service/AiServerClient.java        ← X-Internal-Key gönderir, 45sn read timeout
    │   │   │   └── dto/                               ← Score / Recommend / Explain DTO'ları
    │   │   ├── config/
    │   │   │   ├── AppConfig.java                     ← restTemplate + aiRestTemplate
    │   │   │   ├── FirebaseConfig.java
    │   │   │   ├── RateLimitFilter.java               ← Bucket4j IP-based limiter
    │   │   │   └── SecurityConfig.java                ← Firebase + permitAll rules + filter chain
    │   │   ├── security/
    │   │   │   └── FirebaseTokenFilter.java           ← Bearer token → SecurityContext
    │   │   ├── error/
    │   │   │   ├── GlobalExceptionHandler.java
    │   │   │   ├── ResourceNotFoundException.java
    │   │   │   └── BusinessException.java
    │   │   ├── product/
    │   │   │   ├── controller/ProductController.java   ← Paginated API
    │   │   │   ├── service/ProductService.java         ← AI çağrı + recommend rate hesabı
    │   │   │   ├── service/AiServiceClient.java        ← /score için ikinci AI client
    │   │   │   ├── model/Product.java
    │   │   │   ├── repository/ProductRepository.java
    │   │   │   └── dto/                                ← Create / Update / Response / Detail / ai/
    │   │   ├── user/, purchase/, streak/, notification/, user_product_rating/,
    │   │   │   favorite/, cart/                       ← Domain modülleri
    │   │   └── scheduler/NotificationScheduler.java
    │   └── resources/
    │       └── application.properties                 ← AI URL + internal-key + rate limit + tracing
    └── test/
        ├── java/com/dermind/DerMind/
        │   ├── product/ProductControllerTest.java
        │   └── ai/
        │       ├── AiControllerTest.java
        │       └── AiServerClientTest.java
        └── resources/
            └── application-test.properties            ← H2 + tracing kapalı
```
