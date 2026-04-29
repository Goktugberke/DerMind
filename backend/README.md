# DerMind Backend

Spring Boot tabanlı REST API — kullanıcı yönetimi, ürün kataloğu, satın alma, streak, bildirim ve AI server proxy katmanı.
**Spring Boot 3.5 · PostgreSQL · Firebase Auth · JPA · Bucket4j · Micrometer Tracing (OTel)**

---

## İçindekiler

1. [Mimari](#mimari)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Kurulum (Lokal)](#kurulum-lokal)
4. [Ortam Değişkenleri](#ortam-değişkenleri)
5. [API Endpointleri](#api-endpointleri)
6. [AI Server Entegrasyonu](#ai-server-entegrasyonu)
7. [Rate Limiting](#rate-limiting)
8. [Idempotency](#idempotency)
9. [Distributed Tracing](#distributed-tracing-opentelemetry)
10. [Testler](#testler)
11. [Proje Yapısı](#proje-yapısı)

---

## Mimari

```
+---------------------------------------------------------------+
|                      DerMind Sistemi                          |
|                                                               |
|  Mobil Uygulama / Frontend                                    |
|       |  Authorization: Bearer <Firebase ID Token>            |
|       v                                                       |
|  Spring Boot Backend (:8080)                                  |
|  +-- FirebaseTokenFilter   -- her istekte token doğrular      |
|  +-- RateLimitFilter       -- IP başı bucket (product+AI)     |
|  +-- IdempotencyFilter     -- POST/PUT duplicate önleme       |
|  +-- UserController        -- /api/users                      |
|  +-- ProductController     -- /api/products  (paginated)      |
|  +-- AiController          -- /api/ai  (proxy + auth)         |
|  +-- PurchaseController    -- /api/purchases                  |
|  +-- StreakController      -- /api/streaks                    |
|  +-- FavoriteController    -- /api/favorites                  |
|  +-- CartController        -- /api/cart                       |
|  +-- NotificationController -- /api/notifications             |
|  +-- UserProductRatingController -- /api/ratings              |
|       |                      |                                |
|       v                      v X-Internal-Key                 |
|  PostgreSQL (:5432)    AI Server (:8000)                      |
|  (JPA/Hibernate)       (FastAPI -- XGBoost/KNN/SHAP)          |
+---------------------------------------------------------------+
```

**Kimlik doğrulama:** Firebase ID token (Google login + email/şifre + telefon). Token `Authorization: Bearer <token>` header'ı ile gelir, `FirebaseTokenFilter` doğrular ve `SecurityContext`'e yerleştirir.

**AI server entegrasyonu:** Backend, AI server'a `X-Internal-Key` shared secret ile gider. Frontend doğrudan AI server'ı çağıramaz — proxy üzerinden geçmek zorundadır.

---

## Hızlı Başlangıç

### Lokal (önerilen)

```bash
# 1. PostgreSQL
docker run -d --name dermind-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dermind -p 5432:5432 postgres:16

# 2. AI Server (ai-server/ klasöründe)
cd ai-server && uvicorn app:app --port 8000 --reload

# 3. Backend
cd backend && ./mvnw spring-boot:run
```

| Servis | URL |
|--------|-----|
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| AI Server | http://localhost:8000 |
| AI Swagger | http://localhost:8000/docs |

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
  postgres:16
```

### 2. Firebase Service Account

[Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts → "Generate new private key" → JSON dosyasını `backend/firebase-service-account.json` olarak kaydet (git'te ignore'lı).

### 3. Uygulamayı Başlat

```bash
./mvnw spring-boot:run
# veya
./mvnw package -DskipTests && java -jar target/DerMind-0.0.1-SNAPSHOT.jar
```

### 4. Veritabanı Şeması

`dev` profili `spring.jpa.hibernate.ddl-auto=update` ile çalışır — tabloları otomatik oluşturur. `prod` profili Flyway migration'larını kullanır.

### 5. Ürünleri Yükle (AI puanlama için zorunlu)

```bash
cd ../ai-server
python seed_products.py --backend-url http://localhost:8080
# Önce dry-run
python seed_products.py --dry-run
```

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
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Virgülle ayrılmış izinli origin'ler |
| `RATELIMIT_PRODUCT_DETAIL_RPM` | `60` | `GET /api/products/{id}` IP başı limit |
| `RATELIMIT_AI_RPM` | `20` | `GET /api/ai/**` IP başı limit |
| `MANAGEMENT_OTLP_TRACING_ENDPOINT` | — | Boş = tracing devre dışı |
| `MANAGEMENT_TRACING_SAMPLING_PROBABILITY` | `0.1` | 0.0–1.0 |

---

## API Endpointleri

Swagger UI: `http://localhost:8080/swagger-ui.html`

### Kimlik Doğrulama

| Endpoint | Auth | Açıklama |
|----------|------|---------|
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
| GET | `/api/products/filter?...` | Çoklu filtre (price, quality, search) |
| GET | `/api/products/top/quality?limit=10` | En kaliteli |
| GET | `/api/products/top/purchased?limit=10` | En çok satılan |
| GET | `/api/products/recommendations/{userId}` | Kural-tabanlı öneri |

**`GET /api/products/{id}` özel davranış:**
Authenticated kullanıcı → AI server'a `is_recommended` (UserProductRating ortalaması) ile gider, response'taki `personalScore` AI'dan gelir.
Anonymous → `personalScore = qualityScore` fallback.

---

### Kullanıcılar — `/api/users`

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| POST | `/api/users/firebase` | Firebase token → kullanıcı kayıt/giriş |
| GET | `/api/users` | Tümü |
| GET | `/api/users/{id}` | Detay |
| GET | `/api/users/me` | Authenticated kullanıcı |
| GET | `/api/users/email/{email}` | Email ile lookup |
| PUT | `/api/users/{id}` | Profil güncelle (skinType, allergens, hasAcne, picture) |
| DELETE | `/api/users/{id}` | Sil |

---

### AI Proxy — `/api/ai`

Backend, AI sunucusuna proxy görevi görür. Mobil bu endpointleri Firebase token ile çağırır; backend kullanıcıyı tanımlar, profili hazırlar ve `X-Internal-Key` ile AI'ya iletir.

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/api/ai/health` | AI server durumu (auth gerektirmez) |
| GET | `/api/ai/score/{productId}` | Kişisel puan + allergen warnings |
| POST | `/api/ai/score/batch` | Çoklu ürün puanlama (maks 50) |
| GET | `/api/ai/recommend?category=X&topK=5` | KNN öneriler |
| GET | `/api/ai/explain/{productId}?language=tr` | SHAP + LLM açıklaması |
| GET | `/api/ai/explain/{productId}/stream` | SSE streaming açıklama |
| GET | `/api/ai/metrics` | AI server metrikleri (ADMIN only) |

```bash
curl http://localhost:8080/api/ai/health
```

```json
{ "ai_server_status": "UP", "ai_server_url": "http://localhost:8000" }
```

AI sunucusu erişilemezse `/score`, `/recommend`, `/explain` → `HTTP 503 AI_SERVER_UNAVAILABLE`.

---

### Diğer Modüller

| Prefix | Açıklama |
|--------|---------|
| `/api/purchases` | Satın alma geçmişi |
| `/api/streaks` | Kullanım serisi takibi |
| `/api/ratings` | Kullanıcı ürün değerlendirmeleri (`wouldRecommend` AI'ya beslenir) |
| `/api/favorites` | Favori ürünler |
| `/api/cart` | Sepet (quantity cap 100, mergeCart desteği) |
| `/api/notifications` | Bildirim yönetimi |

---

## AI Server Entegrasyonu

İki ayrı client var:

```
ProductService.getProductById()  --+
                                   +--> AiServiceClient (X-Internal-Key)  --> POST /score
                                   |    tek-amaçlı, recommend rate hesaplı
                                   |
AiController.*                   --+--> AiServerClient (X-Internal-Key)   --> POST /score
                                        proxy, mobil için                      POST /score/batch
                                        45sn read timeout (LLM)               POST /recommend
                                                                               POST /explain
                                                                               POST /explain/stream
```

**Önemli detaylar:**

- `Product.sephoraProductId` boş olan ürünler AI puanı alamaz (HTTP 400).
- `AiServiceClient`, ürünün `UserProductRating.wouldRecommend` ortalamasını **`is_recommended`** olarak iletir → modelin SHAP #1 feature'ı (etki ~1.32).
- `User.hasAcne` ve `User.allergens` doğru iletilir.
- AI server null döndüğünde `personalScore` → `qualityScore` fallback.

**RestTemplate timeout** (`AppConfig.java`):
- `restTemplate` (default): connect 3sn, read 10sn
- `aiRestTemplate` (AI proxy için): connect 3sn, read **45sn** — `/explain` LLM çağrısı uzun sürebilir

---

## Rate Limiting

`RateLimitFilter` (Bucket4j, IP başı per-minute token bucket). AI maliyeti olan endpoint'leri sınırlar:

| Endpoint | Default | Override |
|----------|---------|----------|
| `GET /api/products/{id}` | 60 req/dk | `RATELIMIT_PRODUCT_DETAIL_RPM` |
| `/api/ai/**` (`/health` hariç) | 20 req/dk | `RATELIMIT_AI_RPM` |

Limit aşılırsa `HTTP 429`:

```json
{ "errorCode": "RATE_LIMIT_EXCEEDED", "message": "Too many requests, please retry later." }
```

IP tespiti için `X-Forwarded-For` header'ı dikkate alınır (proxy/load balancer arkası).

---

## Idempotency

`IdempotencyFilter`, `POST / PUT / PATCH` isteklerinde `Idempotency-Key` header'ını okur. Aynı key ile gelen duplicate istek, 24 saat içinde cache'lenmiş response'u döndürür — chain tekrar çalıştırılmaz.

```http
POST /api/purchases
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Hata response'ları (`4xx`, `5xx`) cache'lenmez; retry serbesttir.

---

## Distributed Tracing (OpenTelemetry)

```env
MANAGEMENT_OTLP_TRACING_ENDPOINT=http://localhost:4317
MANAGEMENT_TRACING_SAMPLING_PROBABILITY=1.0
```

Spring Boot tracing otomatik:
- HTTP request'leri (servlet filter)
- JDBC sorguları
- `RestTemplate` çağrıları → AI server'a giderken trace ID propagate edilir

AI server tarafında `OTEL_ENABLED=true` ise aynı OTLP collector'a span gönderir → cross-service trace.

```bash
# Jaeger ile lokal test
docker run -d -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one:latest
```

---

## Testler

```bash
./mvnw test
./mvnw test -Dtest=ProductControllerTest
```

**Test profili** (`application-test.properties`):
- H2 in-memory veritabanı
- Docker Compose devre dışı
- Cache kapalı

**Mevcut testler:**

| Sınıf | Tip | Test Sayısı |
|-------|-----|-------------|
| `ProductControllerTest` | `@WebMvcTest` | 11 |
| `AiControllerTest` | `@WebMvcTest` | 7 |
| `AiServerClientTest` | Birim (Mockito) | 7 |
| `AiServiceClientTest` | Birim (Mockito) | 9 |
| `CartServiceTest` | Birim (Mockito) | 21 |
| `FavoriteServiceTest` | Birim (Mockito) | 12 |
| `UserServiceTest` | Birim (Mockito) | 26 |
| `ProductServiceTest` | Birim (Mockito) | 15 |
| `PurchaseServiceTest` | Birim (Mockito) | 15 |
| `StreakServiceTest` | Birim (Mockito) | 12 |
| `NotificationServiceTest` | Birim (Mockito) | 12 |
| `UserProductRatingServiceTest` | Birim (Mockito) | 12 |
| `RateLimitFilterTest` | Birim | 8 |
| `IdempotencyFilterTest` | Birim | 11 |
| **Toplam** | | **178** |

---

## Proje Yapısı

```
backend/
+-- pom.xml                     <- Spring Boot 3.5, Lombok, MapStruct, Bucket4j,
|                                   Micrometer Tracing OTel, H2 (test)
+-- src/
    +-- main/
    |   +-- java/com/dermind/DerMind/
    |   |   +-- DerMindApplication.java
    |   |   +-- ai/
    |   |   |   +-- controller/AiController.java       <- /api/ai proxy (Firebase auth)
    |   |   |   +-- service/AiServerClient.java        <- X-Internal-Key, 45sn timeout, SSE
    |   |   |   +-- dto/                               <- Score/Recommend/Explain/Batch DTO'ları
    |   |   +-- config/
    |   |   |   +-- AppConfig.java                     <- restTemplate + aiRestTemplate
    |   |   |   +-- SecurityConfig.java                <- Firebase + CORS + filter chain
    |   |   |   +-- RateLimitFilter.java               <- Bucket4j IP-based limiter
    |   |   |   +-- IdempotencyFilter.java             <- POST/PUT dedup (24h TTL)
    |   |   |   +-- OpenApiConfig.java                 <- Springdoc + JWT bearer scheme
    |   |   |   +-- AiServerHealthIndicator.java       <- /actuator/health AI detayı
    |   |   |   +-- AuditConfig.java                   <- @CreatedDate/@LastModifiedDate
    |   |   +-- security/
    |   |   |   +-- FirebaseTokenFilter.java           <- Bearer token -> SecurityContext
    |   |   |   +-- CurrentUser.java                   <- @CurrentUser annotation
    |   |   |   +-- CurrentUserArgumentResolver.java   <- Controller param injection
    |   |   |   +-- AuthorizationService.java          <- Sahiplik kontrolleri
    |   |   +-- error/
    |   |   |   +-- GlobalExceptionHandler.java
    |   |   |   +-- AiServerUnavailableException.java  <- ResourceAccessException -> 503
    |   |   |   +-- ResourceNotFoundException.java
    |   |   |   +-- BusinessException.java
    |   |   +-- product/
    |   |   |   +-- controller/ProductController.java  <- Paginated API, @Validated
    |   |   |   +-- service/ProductService.java        <- AI çağrı + recommend rate
    |   |   |   +-- service/AiServiceClient.java       <- /score için ikinci AI client
    |   |   |   +-- mapper/ProductMapper.java          <- MapStruct
    |   |   |   +-- model/, repository/, dto/
    |   |   +-- user/, purchase/, streak/, notification/,
    |   |   |   user_product_rating/, favorite/, cart/ <- Domain modülleri (her birinde
    |   |   |                                             controller/service/mapper/model/repo/dto)
    |   |   +-- common/
    |   |   |   +-- model/AuditableEntity.java         <- @CreatedDate/@LastModifiedDate base
    |   |   |   +-- enums/UsageDurationUnit.java
    |   |   +-- scheduler/NotificationScheduler.java
    |   +-- resources/
    |       +-- application.properties                 <- AI URL, CORS, rate limit, tracing
    |       +-- application-dev.properties             <- SQL log aktif, ddl=update
    |       +-- application-prod.properties            <- Flyway aktif, ddl=validate
    |       +-- logback-spring.xml                     <- Structured JSON logging
    |       +-- db/migration/                          <- Flyway migration'ları
    +-- test/
        +-- java/com/dermind/DerMind/
        |   +-- ai/             <- AiControllerTest, AiServerClientTest
        |   +-- product/        <- ProductControllerTest, ProductServiceTest, AiServiceClientTest
        |   +-- cart/           <- CartServiceTest
        |   +-- favorite/       <- FavoriteServiceTest
        |   +-- user/           <- UserServiceTest
        |   +-- purchase/       <- PurchaseServiceTest
        |   +-- streak/         <- StreakServiceTest
        |   +-- notification/   <- NotificationServiceTest
        |   +-- user_product_rating/ <- UserProductRatingServiceTest
        |   +-- config/         <- RateLimitFilterTest, IdempotencyFilterTest
        +-- resources/
            +-- application-test.properties  <- H2 + tracing/cache kapalı
```
