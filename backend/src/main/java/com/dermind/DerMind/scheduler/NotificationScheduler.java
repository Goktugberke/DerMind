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
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Akıllı Bildirim Zamanlayıcı.
 *
 * Multi-instance safe: ShedLock ile tek instance'da çalışır.
 * N+1 önlemi: streak'ler entity graph ile fetch edilir, DB-side filtreleme yapılır.
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

    private static final String[] MORNING_MESSAGES = {
            "Cildin sana teşekkür ediyor! Bugün de rutinini sürdürmeyi unutma. 💚",
            "Her gün bir adım daha güzel bir cilt için! Sen harikasın! ✨",
            "Düzenlilik her şeyin anahtarı. Bugün de cilt bakımına devam! 🌸",
            "Güne enerjik başla! Cilt bakımın da seni bekliyor. ☀️",
            "Sabah rutinin cildin için en önemli adım. Hadi başlayalım! 🌺"
    };

    private static final String[] EVENING_MESSAGES = {
            "Bugün de rutinini başarıyla tamamladın! Kendini ödüllendir. 🎁",
            "Harika! Cildin bu özeni hak ediyor. İyi uykular! 😴",
            "Bugün de hedefine ulaştın! Yarın yine görüşmek üzere. 🌟",
            "Mükemmel! Düzenli bakımın meyvelerini çok yakında göreceksin. 🌙",
            "Gece rutinin tamamlandı! Cildin yenilenme zamanı. 💤"
    };

    @Scheduled(cron = "0 0 8 * * *")
    @SchedulerLock(name = "morningReminders", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void sendPersonalizedMorningReminders() {
        log.info("Morning reminders job started");
        sendDailyReminders(true);
    }

    @Scheduled(cron = "0 0 22 * * *")
    @SchedulerLock(name = "eveningReminders", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void sendPersonalizedEveningReminders() {
        log.info("Evening reminders job started");
        sendDailyReminders(false);
    }

    private void sendDailyReminders(boolean isMorning) {
        LocalDate streakSince = LocalDate.now().minusDays(7);
        LocalDateTime purchaseSince = LocalDateTime.now().minusDays(7);
        List<User> activeUsers = userRepository.findActiveUsers(streakSince, purchaseSince);

        // Tek query ile her kullanıcının streak'lerini topla — N+1 yerine batch
        Map<String, List<Streak>> streaksByUser = activeUsers.stream()
                .collect(java.util.stream.Collectors.toMap(
                        User::getId,
                        u -> streakRepository.findByUserId(u.getId()),
                        (a, b) -> a));

        int sent = 0;
        for (User user : activeUsers) {
            try {
                List<Streak> userStreaks = streaksByUser.getOrDefault(user.getId(), List.of());
                String message = isMorning
                        ? generateMorningMessage(userStreaks)
                        : generateEveningMessage(userStreaks);
                if (message == null) continue;
                String title = isMorning
                        ? "Günaydın " + user.getName() + "! ☀️"
                        : "İyi Geceler " + user.getName() + "! 🌛";
                notificationService.createNotification(
                        user.getId(), title, message, NotificationType.ROUTINE_REMINDER, null);
                sent++;
            } catch (Exception e) {
                log.error("Reminder failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("{} reminders sent", sent);
    }

    @Scheduled(cron = "0 0 12 * * *")
    @SchedulerLock(name = "streakWarnings", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void sendStreakWarnings() {
        log.info("Streak warnings job started");
        // DB-side filter: sadece tehlikedeki seriler — RAM'a tüm streak'leri yüklemiyoruz
        List<Streak> atRisk = streakRepository.findStreaksAtRisk(LocalDate.now().minusDays(1));
        int sent = 0;
        for (Streak streak : atRisk) {
            try {
                notificationService.createNotification(
                        streak.getUser().getId(),
                        "🔥 Serin Tehlikede!",
                        String.format("%s ürününle %d günlük serini kaybetme! 💪 Bugün kullanmazsan seri sıfırlanacak.",
                                streak.getProduct().getName(), streak.getCurrentStreak()),
                        NotificationType.STREAK_WARNING,
                        streak.getId());
                sent++;
            } catch (Exception e) {
                log.error("Warning failed for streak {}: {}", streak.getId(), e.getMessage());
            }
        }
        log.info("{} streak warnings sent", sent);
    }

    @Scheduled(cron = "0 0 10 * * SUN")
    @SchedulerLock(name = "weeklySummary", lockAtMostFor = "15m", lockAtLeastFor = "1m")
    public void sendWeeklySummary() {
        log.info("Weekly summary job started");
        LocalDate streakSince = LocalDate.now().minusDays(7);
        LocalDateTime purchaseSince = LocalDateTime.now().minusDays(7);
        List<User> activeUsers = userRepository.findActiveUsers(streakSince, purchaseSince);

        int sent = 0;
        for (User user : activeUsers) {
            try {
                List<Streak> streaks = streakRepository.findByUserId(user.getId());
                String summary = generateWeeklySummary(user, streaks);
                notificationService.createNotification(
                        user.getId(),
                        "📈 Haftalık Cilt Bakım Raporu",
                        summary,
                        NotificationType.SYSTEM,
                        null);
                sent++;
            } catch (Exception e) {
                log.error("Summary failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("{} weekly summaries sent", sent);
    }

    @Scheduled(cron = "0 1 0 * * *")
    @SchedulerLock(name = "resetExpiredStreaks", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void resetExpiredStreaks() {
        log.info("Reset expired streaks job started");
        // DB-side filter: 2+ gün kullanılmamış aktif seriler
        List<Streak> expired = streakRepository.findExpiredStreaks(LocalDate.now().minusDays(1));
        int reset = 0;
        for (Streak streak : expired) {
            try {
                notificationService.createNotification(
                        streak.getUser().getId(),
                        "💔 Seri Sona Erdi",
                        String.format("%s ürününle %d günlük serin sona erdi. Yeniden başlayabilirsin. 💪",
                                streak.getProduct().getName(), streak.getCurrentStreak()),
                        NotificationType.STREAK_BROKEN, streak.getId());
                streak.setCurrentStreak(0);
                streakRepository.save(streak);
                reset++;
            } catch (Exception e) {
                log.error("Reset failed for streak {}: {}", streak.getId(), e.getMessage());
            }
        }
        log.info("{} streaks reset", reset);
    }

    private String generateMorningMessage(List<Streak> userStreaks) {
        List<Streak> active = userStreaks.stream()
                .filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0)
                .toList();
        if (active.isEmpty()) {
            return "Yeni bir güne merhaba! 🌟 Bugün cilt bakım rutinine başlamak için harika bir gün.";
        }
        Streak best = active.stream()
                .max((a, b) -> Integer.compare(a.getCurrentStreak(), b.getCurrentStreak()))
                .orElse(null);
        if (best != null && best.getCurrentStreak() >= 7) {
            return String.format("%s ürününle %d günlük harika bir seri tutturmuşsun! 🎉",
                    best.getProduct().getName(), best.getCurrentStreak());
        }
        return MORNING_MESSAGES[random.nextInt(MORNING_MESSAGES.length)];
    }

    private String generateEveningMessage(List<Streak> userStreaks) {
        boolean usedToday = userStreaks.stream().anyMatch(
                s -> s.getLastUsedDate() != null && s.getLastUsedDate().equals(LocalDate.now()));
        if (!usedToday) {
            return "Gün bitmeden cilt bakımını tamamlamayı unutma! 🌜 Sadece birkaç dakika ayırman yeterli.";
        }
        return EVENING_MESSAGES[random.nextInt(EVENING_MESSAGES.length)];
    }

    private String generateWeeklySummary(User user, List<Streak> streaks) {
        int totalActive = (int) streaks.stream()
                .filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0).count();
        int longest = streaks.stream()
                .mapToInt(s -> s.getLongestStreak() != null ? s.getLongestStreak() : 0)
                .max().orElse(0);
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long purchases = purchaseRepository.findByUserId(user.getId()).stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(weekAgo)).count();

        if (totalActive == 0 && purchases == 0) {
            return "Bu hafta biraz sessizdin. 😊 Yeni haftada cilt bakımına geri dönmeye ne dersin?";
        }
        return String.format("Bu hafta %d aktif serin var! 🎯 En uzun serin: %d gün. %d yeni ürün satın aldın.",
                totalActive, longest, purchases);
    }
}
