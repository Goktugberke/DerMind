# DerMind — Yapilacaklar Listesi

---

## BACKEND — Temizlik

### SMS Servisi — SILINMELI
- [ ] `sms-server/` klasorunu tamamen sil
- [ ] `backend/SecurityConfig.java` icindeki `/api/sms/send` izin satirini kaldir
- **Neden:** SMS servisi hic entegre edilmemis. Main backend bu servisi hic cagirmiyor. Twilio credentials hardcoded durumda (guvenlik riski).

### Mail Servisi — KARAR VER
- [ ] `mail-server/` klasorunu sil VEYA backend ile entegre et
- [ ] `backend/pom.xml` icindeki `spring-boot-starter-mail` dependency'yi kaldir (kullanilmiyor)
- **Neden:** Mail servisi de main backend'e hic bagli degil. Eger gelecekte notification e-postasi planlaniyorsa entegre edilmeli, yoksa silinmeli.

---

## BACKEND — Eksik Implementasyon

### Favorite Entity — IMPLEMENTE EDILMELI veya KALDIRILMALI
- [ ] `Product.java` icindeki `List<Favorite> favorites` alani var ama `Favorite` entity sinifi yok
- [ ] Ya `Favorite.java` entity sinifini olustur (id, user, product, createdAt alanlari ile)
- [ ] Ya da `Product.java`'dan bu alani tamamen sil
- **Neden:** Eksik implementasyon — derleme uyarisi verebilir, UML ile tutarsiz.

---

## RAPOR — UML Duzeltmeleri

Asagidaki maddeler rapordaki UML'de yanlis/eksik gosterilmis:

### Kaldirilmasi Gerekenler
- [ ] `<<Interface>> AiService / RecommendationEngine` UML'den cikar — kodda bu interface yok, `ProductService` icinde direkt metod olarak implemente edilmis
- [ ] `ReminderNotification`, `SystemNotification`, `RecommendationNotification` alt siniflarini kaldir — kodda tek `Notification` entity var, `NotificationType` enum ile ayristiriliyor

### Eklenmesi Gerekenler
- [ ] `PurchaseController` — kodda var, UML'de yok
- [ ] `StreakController` — kodda var, UML'de yok
- [ ] `UserProductRatingController` — kodda var, UML'de yok
- [ ] `NotificationType` enum'u goster (ROUTINE_REMINDER, ORDER_UPDATE, STREAK_ALERT, SYSTEM_MESSAGE, STREAK_WARNING, STREAK_BROKEN, PROMOTION)
- [ ] `User.id` tipini `Long` degil `String` olarak goster (OAuth2 icin String kullaniliyor)
- [ ] `Streak` entity icindeki gercek field'lari ekle: `usageFrequency`, `usageTime`, `dailyUsageCounter`, `totalUses`, `isActive`

---

## RAPOR — Metrikler

- [ ] "Siniflandirma Raporu" ve "Confusion Matrix" bolumlerini rapordaki AI/ML bolumunden cikar — model REGRESSION yapıyor, classification degil
- [ ] Raporda sadece MAE, RMSE, R2, 5-Fold CV R2 degerlerini bırak
- [ ] README.md'deki model performans tablosu zaten dogru — raporu README ile uyumlu hale getir

---

## AI SERVER — Gelecek Iyilestirmeler

- [ ] `/score` endpointi Spring Boot tarafindan aktif olarak cagriliyor mu kontrol et
- [ ] Cold start modeli ne zaman devreye giriyor — dokumante et
- [ ] Model yeniden egitim (retrain) stratejisi belirle — ne zaman, kim tetikleyecek

