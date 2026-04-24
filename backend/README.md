# DerMind Backend

Spring Boot tabanlı REST API — kullanıcı yönetimi, ürün kataloğu, satın alma, streak, bildirimler ve AI server proxy katmanı.  
**Spring Boot 3.5 · PostgreSQL · OAuth2 (Google) · JPA · TestContainers**

---

## İçindekiler

1. [Mimari](#mimari)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Kurulum (Lokal)](#kurulum-lokal)
4. [Kurulum (Docker Compose)](#kurulum-docker-compose)
5. [Ortam Değişkenleri](#ortam-değişkenleri)
6. [API Endpointleri](#api-endpointleri)
7. [AI Server Entegrasyonu](#ai-server-entegrasyonu)
8. [Testler](#testler)
9. [Proje Yapısı](#proje-yapısı)

---

## Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                      DerMind Sistemi                        │
│                                                             │
│  Mobil Uygulama                                             │
│       │                                                     │
│       ▼                                                     │
│  Spring Boot Backend (:8080)                                │
│  ├── UserController         → /api/users                   │
│  ├── ProductController      → /api/products                │
│  ├── AiController           → /api/ai  (proxy)             │
│  ├── PurchaseController     → /api/purchases               │
│  ├── StreakController       → /api/streaks                 │
│  ├── NotificationController → /api/notifications           │
│  └── UserProductRatingController → /api/ratings            │
│       │                      │                             │
│       ▼                      ▼                             │
│  PostgreSQL (:5432)    AI Server (:8000)                    │
│  (JPA/Hibernate)       (FastAPI — XGBoost/KNN/SHAP)        │
└─────────────────────────────────────────────────────────────┘
```

**Kimlik doğrulama:** Google OAuth2 / OIDC. Tüm `/api/**` endpointleri (hariç `/api/ai/health`) kimlik doğrulaması gerektirir.

---

## Hızlı Başlangıç

### Docker Compose ile (önerilen)

Tüm sistem — PostgreSQL, AI sunucusu, backend ve frontend — tek komutla ayağa kalkar:

```bash
# Bu repo'nun backend/ klasöründe çalıştır
cd backend

# Ortam değişkenlerini hazırla
cp .env.example .env
# .env içinde POSTGRES_USER ve POSTGRES_PASSWORD'ü doldur

# Sistemi başlat
docker compose up --build
```

Başarılı başlangıçtan sonra:

| Servis | URL |
|--------|-----|
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| AI Server | http://localhost:8000 |
| AI Swagger | http://localhost:8000/docs |
| Frontend | http://localhost:80 |

Sistemi durdurmak için:
```bash
docker compose down          # konteynerları durdur
docker compose down -v       # konteynerları ve veri hacmini (DB) sil
```

---

## Kurulum (Lokal)

### Gereksinimler

- Java 21+
- Maven 3.9+ (ya da projedeki `./mvnw` sarmalayıcısını kullan)
- PostgreSQL 15+ (ya da Docker ile: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15`)

### 1. PostgreSQL'i Hazırla

```bash
# Docker ile hızlı başlat
docker run -d \
  --name dermind-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dermind \
  -p 5432:5432 \
  postgres:15
```

### 2. Google OAuth2 Kimlik Bilgilerini Ayarla

[Google Cloud Console](https://console.cloud.google.com/apis/credentials)'a gir, OAuth 2.0 kimlik bilgisi oluştur.  
İzin verilen yönlendirme URI: `http://localhost:8080/login/oauth2/code/google`

`application.properties` dosyasını güncelle:

```properties
spring.security.oauth2.client.registration.google.client-id=GERCEK_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=GERCEK_CLIENT_SECRET
```

### 3. Uygulamayı Başlat

```bash
# Proje kökünden (backend/ klasörü)
./mvnw spring-boot:run

# Ya da önce derle, sonra çalıştır
./mvnw package -DskipTests
java -jar target/DerMind-0.0.1-SNAPSHOT.jar
```

Uygulama başladığında:
```
Started DerMindApplication in X.XXX seconds
```

### 4. Veritabanı Şeması

Uygulama `spring.jpa.hibernate.ddl-auto=update` ile ayarlıdır — tabloları otomatik oluşturur.  
İlk başlangıçta `products`, `users`, `purchases`, `streaks`, `notifications`, `user_product_ratings` tabloları oluşur.

### 5. Ürünleri Yükle (isteğe bağlı)

AI puanlama özelliği için ürünlerin `sephoraProductId` alanının dolu olması gerekir.  
`ai-server/seed_products.py` ile CSV'deki 4.692 ürünü içeri aktarabilirsin:

```bash
cd ../ai-server
python seed_products.py --backend-url http://localhost:8080
```

---

## Kurulum (Docker Compose)

`compose.yaml` dosyası dört servisi yönetir:

| Servis | Port | Bağımlılık |
|--------|------|-----------|
| `postgres` | 5432 | — |
| `ai-server` | 8000 | — |
| `backend` | 8080 | postgres (healthy) + ai-server (healthy) |
| `frontend` | 80 | — |

Backend, AI sunucusu hazır olmadan başlamaz (`depends_on: ai-server: condition: service_healthy`).  
`AI_SERVER_URL=http://ai-server:8000` ortam değişkeni ile AI sunucusuna iç ağdan bağlanır.

### .env Dosyası

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=guclu_bir_sifre

# Google OAuth2 (compose içinde backend'in ortam değişkenine enjekte edilir)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Ortam Değişkenleri

`application.properties` içindeki değerler ortam değişkenleriyle geçersiz kılınabilir  
(Spring Boot relaxed binding: `AI_SERVER_URL` → `ai.server.url`).

| Değişken | Varsayılan | Açıklama |
|----------|-----------|---------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/dermind` | PostgreSQL bağlantı URL'i |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | DB kullanıcı adı |
| `SPRING_DATASOURCE_PASSWORD` | `postgres` | DB şifresi |
| `AI_SERVER_URL` | `http://localhost:8000` | AI sunucusu adresi |
| `SPRING_PROFILES_ACTIVE` | — | `dev` veya `prod` |

---

## API Endpointleri

Tüm endpointler `/api` prefix'i ile başlar. Swagger UI: `http://localhost:8080/swagger-ui.html`

### Kimlik Doğrulama

| Endpoint | Auth | Açıklama |
|----------|------|---------|
| `GET /` | Hayır | Ana sayfa |
| `GET /login` | Hayır | Google OAuth2 yönlendirmesi |
| `GET /api/ai/health` | Hayır | AI sunucusu sağlık kontrolü |
| Diğer tüm `/api/**` | **Gerekli** | Google OAuth2 ile giriş yapılmış olmalı |

---

### Ürünler — `/api/products`

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/api/products` | Tüm ürünleri listele |
| GET | `/api/products/{id}` | ID ile ürün getir |
| POST | `/api/products` | Yeni ürün oluştur |
| PUT | `/api/products/{id}` | Ürün güncelle |
| DELETE | `/api/products/{id}` | Ürün sil |
| GET | `/api/products/search?q={terim}` | İsim veya marka ile ara |
| GET | `/api/products/brand/{marka}` | Markaya göre filtrele |
| GET | `/api/products/quality?min={puan}` | Kalite puanına göre filtrele |
| GET | `/api/products/top/quality?limit=10` | En kaliteli ürünler |
| GET | `/api/products/top/purchased?limit=10` | En çok satın alınan |
| GET | `/api/products/recommendations/{userId}` | Kullanıcıya özel öneri (basit) |

**POST /api/products örneği:**

```json
{
  "name": "Barrier Moisture Cream",
  "brand": "COSRX",
  "ingredients": "Contains 24 ingredients. Beneficial for: dry, normal. Banned: 0, Restricted: 1.",
  "qualityScore": 8.5,
  "sephoraProductId": "P123456",
  "baseScore": 8.2,
  "category": "Skincare",
  "secondaryCategory": "Moisturizers",
  "sephoraRating": 4.6,
  "priceUsd": 38.0
}
```

---

### Kullanıcılar — `/api/users`

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/api/users` | Tüm kullanıcılar |
| GET | `/api/users/{id}` | Kullanıcı detayı |
| POST | `/api/users` | Yeni kullanıcı (OAuth2 akışında otomatik oluşturulur) |
| PUT | `/api/users/{id}` | Profil güncelle (cilt tipi, alerjenler) |
| DELETE | `/api/users/{id}` | Kullanıcı sil |

---

### AI Proxy — `/api/ai`

Backend, AI sunucusuna proxy görevi görür. Mobil bu endpointleri çağırır; backend kullanıcı kimliğini ve ürün verilerini otomatik ekler.

| Method | Endpoint | Açıklama |
|--------|----------|---------|
| GET | `/api/ai/health` | AI sunucusu durumu (auth gerektirmez) |
| GET | `/api/ai/score/{productId}` | Ürün için XGBoost puanı |
| GET | `/api/ai/recommend?category=X&topK=5` | KNN ürün önerisi |
| GET | `/api/ai/explain/{productId}?language=tr` | SHAP + LLM açıklaması |

**Örnek: AI health kontrolü**
```bash
curl http://localhost:8080/api/ai/health
```
```json
{
  "ai_server_status": "UP",
  "ai_server_url": "http://localhost:8000"
}
```

AI sunucusu erişilemez durumdaysa `/api/ai/score`, `/api/ai/recommend` ve `/api/ai/explain` endpointleri `HTTP 503` döner — mobil bu durumu gracefully ele almalıdır.

---

### Diğer Modüller

| Prefix | Açıklama |
|--------|---------|
| `/api/purchases` | Satın alma geçmişi CRUD |
| `/api/streaks` | Kullanım serisi takibi |
| `/api/ratings` | Kullanıcı ürün değerlendirmeleri |
| `/api/notifications` | Bildirim yönetimi |

---

## AI Server Entegrasyonu

Entegrasyon `AiServerClient` servis sınıfı üzerinden yürür:

```
AiController (HTTP proxy)
    └── AiServerClient (RestTemplate, 35sn timeout)
            └── FastAPI AI Server :8000
```

**Önemli:** `Product.sephoraProductId` alanı AI server ile köprü kuran kritik alandır.  
Bu alan boş olan ürünler için `/api/ai/score` ve `/api/ai/explain` çağrıları `HTTP 400` döner.

**AI sunucusu çalışmıyorken davranış:**
- `AiServerClient` `null` döner (exception fırlatmaz).
- `AiController` `null` görünce `HTTP 503` döner.
- Veritabanı ve diğer API'ler etkilenmez.

**RestTemplate zaman aşımı ayarları** (`RestTemplateConfig.java`):
- Bağlantı: 5 saniye
- Okuma: 35 saniye (`/explain` LLM çağrısı 30 saniyeye kadar sürebilir)

---

## Testler

```bash
# Tüm testleri çalıştır (H2 in-memory DB, Docker gerektirmez)
./mvnw test

# Belirli test sınıfı
./mvnw test -Dtest=ProductControllerTest

# Test coverage raporu
./mvnw test jacoco:report
# Rapor: target/site/jacoco/index.html
```

**Test profili** (`application-test.properties`):
- H2 in-memory veritabanı (PostgreSQL gerekmez)
- Docker Compose devre dışı
- Sahte Google OAuth2 kimlik bilgileri

**Mevcut testler:**

| Sınıf | Tip | Test Sayısı |
|-------|-----|-------------|
| `ProductControllerTest` | `@WebMvcTest` | 9 |
| `AiControllerTest` | `@WebMvcTest` | 7 |
| `AiServerClientTest` | Birim (Mockito) | 7 |
| **Toplam** | | **23** |

---

## Proje Yapısı

```
backend/
├── Dockerfile                  ← Çok aşamalı Maven + JRE imajı
├── compose.yaml                ← Tam sistem Docker Compose (postgres + ai + backend + frontend)
├── pom.xml                     ← Bağımlılıklar (Spring Boot 3.5, Lombok, TestContainers, H2)
└── src/
    ├── main/
    │   ├── java/com/dermind/DerMind/
    │   │   ├── DerMindApplication.java
    │   │   ├── HomeController.java
    │   │   ├── ai/
    │   │   │   ├── controller/AiController.java       ← AI proxy endpoint'leri
    │   │   │   ├── service/AiServerClient.java        ← FastAPI HTTP istemcisi
    │   │   │   └── dto/                               ← AI istek/yanıt DTO'ları
    │   │   ├── config/
    │   │   │   ├── RestTemplateConfig.java            ← 35sn timeout ayarı
    │   │   │   └── SecurityConfig.java                ← OAuth2 + yetkilendirme kuralları
    │   │   ├── error/
    │   │   │   ├── GlobalExceptionHandler.java        ← Merkezi hata yönetimi
    │   │   │   ├── ResourceNotFoundException.java
    │   │   │   ├── BusinessException.java
    │   │   │   └── ...
    │   │   ├── product/
    │   │   │   ├── controller/ProductController.java
    │   │   │   ├── service/ProductService.java
    │   │   │   ├── model/Product.java
    │   │   │   ├── repository/ProductRepository.java
    │   │   │   └── dto/                               ← Create / Update / Response / Detail
    │   │   ├── user/
    │   │   ├── purchase/
    │   │   ├── streak/
    │   │   ├── notification/
    │   │   ├── user_product_rating/
    │   │   ├── favorite/
    │   │   ├── security/CustomOAuth2UserService.java  ← Google login → DB kullanıcı kaydı
    │   │   └── scheduler/NotificationScheduler.java
    │   └── resources/
    │       └── application.properties
    └── test/
        ├── java/com/dermind/DerMind/
        │   ├── product/ProductControllerTest.java
        │   └── ai/
        │       ├── AiControllerTest.java
        │       └── AiServerClientTest.java
        └── resources/
            └── application-test.properties            ← H2 + devre dışı Docker Compose
```
