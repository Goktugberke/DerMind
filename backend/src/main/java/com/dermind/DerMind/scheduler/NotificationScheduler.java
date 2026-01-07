package com.dermind.DerMind.scheduler;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.notification.service.NotificationService;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.streak.repository.StreakRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Random;

/**
 * Akıllı Bildirim Zamanlayıcı
 * - Kullanıcı davranışlarını analiz eder
 * - Kişiselleştirilmiş mesajlar gönderir
 * - Streak durumlarına göre müdahale eder
 *
 * @author DerMind Team
 * @version 1.0
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final StreakRepository streakRepository;
    private final PurchaseRepository purchaseRepository;

    private final Random random = new Random();

    /**
     * Her sabah 08:00'da çalışır - Aktif kullanıcılara özel sabah mesajları
     * Test için: // Her 2 dakikada bir
            */
    @Scheduled(cron = "0 0 8 * * *")
    public void sendPersonalizedMorningReminders() {
        log.info("🌅 Kişiselleştirilmiş sabah bildirimleri hazırlanıyor...");

        List<User> activeUsers = userRepository.findAll().stream()
                .filter(this::isActiveUser)
                .toList();

        int sentCount = 0;
        for (User user : activeUsers) {
            try {
                String message = generateMorningMessage(user);
                if (message != null) {
                    notificationService.createNotification(
                            user.getId(),
                            "Günaydın " + user.getName() + "! ☀️",
                            message,
                            NotificationType.ROUTINE_REMINDER,
                            null
                    );
                    sentCount++;
                }
            } catch (Exception e) {
                log.error("❌ Kullanıcı {} için sabah bildirimi oluşturulamadı: {}",
                        user.getId(), e.getMessage());
            }
        }

        log.info("✅ {} kullanıcıya sabah bildirimi gönderildi.", sentCount);
    }

    /**
     * Her gece 22:00'da çalışır - Akşam rutini hatırlatmaları
     * Test için:/ Her 3 dakikada bir
            */
    @Scheduled(cron = "0 0 22 * * *")
    public void sendPersonalizedEveningReminders() {
        log.info("🌙 Kişiselleştirilmiş akşam bildirimleri hazırlanıyor...");

        List<User> activeUsers = userRepository.findAll().stream()
                .filter(this::isActiveUser)
                .toList();

        int sentCount = 0;
        for (User user : activeUsers) {
            try {
                String message = generateEveningMessage(user);
                if (message != null) {
                    notificationService.createNotification(
                            user.getId(),
                            "İyi Geceler " + user.getName() + "! 🌛",
                            message,
                            NotificationType.ROUTINE_REMINDER,
                            null
                    );
                    sentCount++;
                }
            } catch (Exception e) {
                log.error("❌ Kullanıcı {} için akşam bildirimi oluşturulamadı: {}",
                        user.getId(), e.getMessage());
            }
        }

        log.info("✅ {} kullanıcıya akşam bildirimi gönderildi.", sentCount);
    }

    /**
     * Her gün öğlen 12:00'da çalışır - Tehlikede olan serilere müdahale
     * Test için: // Her 5 dakikada bir
            */
    @Scheduled(cron = "0 0 12 * * *")
    public void sendStreakWarnings() {
        log.info("⚠️ Tehlikede olan seriler kontrol ediliyor...");

        List<Streak> allStreaks = streakRepository.findAll();
        int warningCount = 0;

        for (Streak streak : allStreaks) {
            try {
                if (isStreakInDanger(streak)) {
                    User user = userRepository.findById(streak.getUser().getId()).orElse(null);
                    if (user != null && isActiveUser(user)) {
                        String message = generateStreakWarningMessage(streak);
                        notificationService.createNotification(
                                user.getId(),
                                "🔥 Serin Tehlikede!",
                                message,
                                NotificationType.STREAK_WARNING,
                                streak.getId()
                        );
                        warningCount++;
                    }
                }
            } catch (Exception e) {
                log.error("❌ Streak {} için uyarı oluşturulamadı: {}",
                        streak.getId(), e.getMessage());
            }
        }

        log.info("⚡ {} kullanıcıya seri uyarısı gönderildi.", warningCount);
    }

    /**
     * Her Pazar 10:00'da çalışır - Haftalık özet raporu
     * Test için:// Her 10 dakikada bir
            */
    @Scheduled(cron = "0 0 10 * * SUN")
    public void sendWeeklySummary() {
        log.info("📊 Haftalık özet raporları hazırlanıyor...");

        List<User> activeUsers = userRepository.findAll().stream()
                .filter(this::isActiveUser)
                .toList();

        int sentCount = 0;
        for (User user : activeUsers) {
            try {
                String summary = generateWeeklySummary(user);
                notificationService.createNotification(
                        user.getId(),
                        "📈 Haftalık Cilt Bakım Raporu",
                        summary,
                        NotificationType.SYSTEM,
                        null
                );
                sentCount++;
            } catch (Exception e) {
                log.error("❌ Kullanıcı {} için haftalık rapor oluşturulamadı: {}",
                        user.getId(), e.getMessage());
            }
        }

        log.info("📧 {} kullanıcıya haftalık rapor gönderildi.", sentCount);
    }

    /**
     * Her gün 00:01'de çalışır - Geçmiş tarihe düşmüş serileri otomatik sıfırla
     * Test için:// Her 15 dakikada bir
            */
    @Scheduled(cron = "0 1 0 * * *")
    public void resetExpiredStreaks() {
        log.info("🔄 Süresi dolmuş seriler kontrol ediliyor...");

        List<Streak> allStreaks = streakRepository.findAll();
        int resetCount = 0;

        LocalDate today = LocalDate.now();

        for (Streak streak : allStreaks) {
            try {
                if (streak.getCurrentStreak() > 0 &&
                        streak.getLastUsedDate() != null &&
                        ChronoUnit.DAYS.between(streak.getLastUsedDate(), today) > 1) {

                    // Seri bozuldu - kullanıcıya bildir
                    User user = userRepository.findById(streak.getUser().getId()).orElse(null);
                    if (user != null) {
                        notificationService.createNotification(
                                user.getId(),
                                "💔 Seri Sona Erdi",
                                String.format(
                                        "%s ürününle %d günlük serin sona erdi. Ama üzülme! Yeniden başlayabilirsin. 💪",
                                        streak.getProduct().getName(),
                                        streak.getCurrentStreak()
                                ),
                                NotificationType.STREAK_BROKEN,
                                streak.getId()
                        );
                    }

                    // Seriyi sıfırla (service katmanında yapılmalı ama burası scheduler)
                    streak.setCurrentStreak(0);
                    streakRepository.save(streak);
                    resetCount++;
                }
            } catch (Exception e) {
                log.error("❌ Streak {} sıfırlanamadı: {}", streak.getId(), e.getMessage());
            }
        }

        log.info("🔁 {} seri otomatik olarak sıfırlandı.", resetCount);
    }

    // ============== YARDIMCI METODLAR ==============

    /**
     * Kullanıcının aktif olup olmadığını kontrol eder
     * Son 7 gün içinde aktivite göstermiş mi?
     */
    private boolean isActiveUser(User user) {
        try {
            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

            // Son 7 günde streak kaydı var mı?
            boolean hasRecentStreak = streakRepository.findByUserId(user.getId()).stream()
                    .anyMatch(s -> s.getLastUsedDate() != null &&
                            s.getLastUsedDate().isAfter(weekAgo.toLocalDate()));

            // Son 7 günde satın alma var mı?
            boolean hasRecentPurchase = purchaseRepository.findByUserId(user.getId()).stream()
                    .anyMatch(p -> p.getCreatedAt().isAfter(weekAgo));

            return hasRecentStreak || hasRecentPurchase;
        } catch (Exception e) {
            log.warn("⚠️ Kullanıcı {} aktiflik kontrolü başarısız: {}", user.getId(), e.getMessage());
            return false; // Hata durumunda spam önlemek için false dön
        }
    }

    /**
     * Kullanıcıya özel sabah mesajı üretir
     */
    private String generateMorningMessage(User user) {
        try {
            List<Streak> activeStreaks = streakRepository.findByUserId(user.getId()).stream()
                    .filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0)
                    .toList();

            if (activeStreaks.isEmpty()) {
                return "Yeni bir güne merhaba! 🌟 Bugün cilt bakım rutinine başlamak için harika bir gün. Hadi başlayalım!";
            }

            // En yüksek seri
            Streak bestStreak = activeStreaks.stream()
                    .max((s1, s2) -> Integer.compare(s1.getCurrentStreak(), s2.getCurrentStreak()))
                    .orElse(null);

            if (bestStreak != null && bestStreak.getCurrentStreak() >= 7) {
                return String.format(
                        "%s ürününle %d günlük harika bir seri tutturmuşsun! 🎉 Bugün de devam edelim!",
                        bestStreak.getProduct().getName(),
                        bestStreak.getCurrentStreak()
                );
            }

            String[] motivationalMessages = {
                    "Cildin sana teşekkür ediyor! Bugün de rutinini sürdürmeyi unutma. 💚",
                    "Her gün bir adım daha güzel bir cilt için! Sen harikasın! ✨",
                    "Düzenlilik her şeyin anahtarı. Bugün de cilt bakımına devam! 🌸",
                    "Güne enerjik başla! Cilt bakımın da seni bekliyor. ☀️",
                    "Sabah rutinin cildin için en önemli adım. Hadi başlayalım! 🌺"
            };

            return motivationalMessages[random.nextInt(motivationalMessages.length)];
        } catch (Exception e) {
            log.error("❌ Sabah mesajı oluşturulamadı: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Kullanıcıya özel akşam mesajı üretir
     */
    private String generateEveningMessage(User user) {
        try {
            List<Streak> streaks = streakRepository.findByUserId(user.getId());

            // Bugün hiç kullanmamış
            boolean usedToday = streaks.stream()
                    .anyMatch(s -> s.getLastUsedDate() != null &&
                            s.getLastUsedDate().equals(LocalDate.now()));

            if (!usedToday) {
                return "Gün bitmeden cilt bakımını tamamlamayı unutma! 🌜 Sadece birkaç dakika ayırman yeterli.";
            }

            String[] eveningMessages = {
                    "Bugün de rutinini başarıyla tamamladın! Kendini ödüllendir. 🎁",
                    "Harika! Cildin bu özeni hak ediyor. İyi uykular! 😴",
                    "Bugün de hedefine ulaştın! Yarın yine görüşmek üzere. 🌟",
                    "Mükemmel! Düzenli bakımın meyvelerini çok yakında göreceksin. 🌙",
                    "Gece rutinin tamamlandı! Cildin yenilenme zamanı. 💤"
            };

            return eveningMessages[random.nextInt(eveningMessages.length)];
        } catch (Exception e) {
            log.error("❌ Akşam mesajı oluşturulamadı: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Serinin tehlikede olup olmadığını kontrol eder
     */
    private boolean isStreakInDanger(Streak streak) {
        try {
            if (streak.getCurrentStreak() == 0) return false;
            if (streak.getLastUsedDate() == null) return false;
            if (!streak.getIsActive()) return false;

            LocalDate today = LocalDate.now();
            long daysSinceLastUse = ChronoUnit.DAYS.between(streak.getLastUsedDate(), today);

            // 1 gün geçmişse ama henüz seri bozulmamışsa uyar
            return daysSinceLastUse == 1;
        } catch (Exception e) {
            log.error("❌ Streak tehlike kontrolü başarısız: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Seri uyarı mesajı üretir
     */
    private String generateStreakWarningMessage(Streak streak) {
        return String.format(
                "%s ürününle %d günlük serini kaybetme! 💪 Bugün kullanmazsan seri sıfırlanacak. Hemen harekete geç!",
                streak.getProduct().getName(),
                streak.getCurrentStreak()
        );
    }

    /**
     * Haftalık özet raporu üretir
     */
    private String generateWeeklySummary(User user) {
        try {
            List<Streak> streaks = streakRepository.findByUserId(user.getId());

            int totalActiveStreaks = (int) streaks.stream()
                    .filter(s -> s.getCurrentStreak() > 0)
                    .count();

            int longestStreak = streaks.stream()
                    .mapToInt(Streak::getLongestStreak)
                    .max()
                    .orElse(0);

            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
            long purchaseCount = purchaseRepository.findByUserId(user.getId()).stream()
                    .filter(p -> p.getCreatedAt().isAfter(weekAgo))
                    .count();

            if (totalActiveStreaks == 0 && purchaseCount == 0) {
                return "Bu hafta biraz sessizdin. 😊 Yeni haftada cilt bakımına geri dönmeye ne dersin? Seni bekliyoruz! 💚";
            }

            return String.format(
                    "Bu hafta %d aktif serin var! 🎯 En uzun serin: %d gün. %d yeni ürün satın aldın. Harikasın, devam et! 💪",
                    totalActiveStreaks,
                    longestStreak,
                    purchaseCount
            );
        } catch (Exception e) {
            log.error("❌ Haftalık özet oluşturulamadı: {}", e.getMessage());
            return "Bu hafta cilt bakım yolculuğunda ilerledin! Devam et! 💪";
        }
    }
}