package com.dermind.DerMind.scheduler;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.notification.service.NotificationService;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.streak.repository.StreakRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.mail.service.MailServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

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
    private final MailServiceClient mailServiceClient;

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

        if (activeUsers.isEmpty()) {
            log.info("No active users for daily reminders");
            return;
        }

        // Tek sorguda tüm kullanıcıların streak'lerini çek — N+1 önleme
        List<String> userIds = activeUsers.stream().map(User::getId).toList();
        Map<String, List<Streak>> streaksByUser = streakRepository.findByUserIdIn(userIds)
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getUser().getId()));

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

        if (activeUsers.isEmpty()) {
            log.info("No active users for weekly summary");
            return;
        }

        // Tek sorguda tüm streak'leri çek
        List<String> userIds = activeUsers.stream().map(User::getId).toList();
        Map<String, List<Streak>> streaksByUser = streakRepository.findByUserIdIn(userIds)
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getUser().getId()));

        int sent = 0;
        for (User user : activeUsers) {
            try {
                List<Streak> streaks = streaksByUser.getOrDefault(user.getId(), List.of());
                String summary = generateWeeklySummary(user, streaks, purchaseSince);
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
        return MORNING_MESSAGES[ThreadLocalRandom.current().nextInt(MORNING_MESSAGES.length)];
    }

    private String generateEveningMessage(List<Streak> userStreaks) {
        boolean usedToday = userStreaks.stream().anyMatch(
                s -> s.getLastUsedDate() != null && s.getLastUsedDate().equals(LocalDate.now()));
        if (!usedToday) {
            return "Gün bitmeden cilt bakımını tamamlamayı unutma! 🌜 Sadece birkaç dakika ayırman yeterli.";
        }
        return EVENING_MESSAGES[ThreadLocalRandom.current().nextInt(EVENING_MESSAGES.length)];
    }

    private String generateWeeklySummary(User user, List<Streak> streaks, LocalDateTime since) {
        int totalActive = (int) streaks.stream()
                .filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0).count();
        int longest = streaks.stream()
                .mapToInt(s -> s.getLongestStreak() != null ? s.getLongestStreak() : 0)
                .max().orElse(0);
        // DB-side count — tüm satın alımları belleğe yüklemeden
        long purchases = purchaseRepository.countByUserIdAndCreatedAtAfter(user.getId(), since);

        if (totalActive == 0 && purchases == 0) {
            return "Bu hafta biraz sessizdin. 😊 Yeni haftada cilt bakımına geri dönmeye ne dersin?";
        }
        return String.format("Bu hafta %d aktif serin var! 🎯 En uzun serin: %d gün. %d yeni ürün satın aldın.",
                totalActive, longest, purchases);
    }

    @Scheduled(cron = "0 0/5 * * * *") // Her 5 dakikada bir çalışır
    @SchedulerLock(name = "streakReminders", lockAtMostFor = "4m", lockAtLeastFor = "1m")
    public void checkAndSendStreakReminders() {
        log.info("Checking for streak reminders...");
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Streak> streaksNeedingReminder = streakRepository.findStreaksNeedingReminder(today);
        int sentCount = 0;

        for (Streak streak : streaksNeedingReminder) {
            if (streak.getCustomTimes() == null || streak.getCustomTimes().isEmpty()) {
                continue;
            }

            for (LocalTime customTime : streak.getCustomTimes()) {
                // Eğer şimdiki zaman, belirlenen süreyi 10 dakika geçmişse ve 15 dakika aralığındaysa
                // (örneğin 10:00 ayarlıysa, 10:10 ile 10:15 arasında tetiklensin)
                LocalTime reminderTimeStart = customTime.plusMinutes(10);
                LocalTime reminderTimeEnd = customTime.plusMinutes(15);

                if (now.isAfter(reminderTimeStart) && now.isBefore(reminderTimeEnd)) {
                    User user = streak.getUser();
                    if (user.getEmail() != null && !user.getEmail().isBlank()) {
                        mailServiceClient.sendStreakReminderMail(user.getEmail(), user.getName(), streak.getProduct().getName());
                        
                        // Aynı gün bir daha atılmasın diye kaydet
                        streak.setLastReminderSentDate(today);
                        streakRepository.save(streak);
                        sentCount++;
                    }
                    break; // Bu streak için bir tane atmamız yeterli
                }
            }
        }
        log.info("{} streak reminders sent", sentCount);
    }
}
