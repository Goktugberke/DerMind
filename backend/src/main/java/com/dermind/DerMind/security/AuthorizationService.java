package com.dermind.DerMind.security;

import com.dermind.DerMind.notification.repository.NotificationRepository;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.streak.repository.StreakRepository;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Spring Security SpEL expressions için authorization helper.
 *
 * Kullanım: @PreAuthorize("@authz.isPurchaseOwner(#id)")
 *
 * Tek tek service'lere ownership check ekleme yerine declarative authorization sağlar.
 */
@Component("authz")
@RequiredArgsConstructor
@Slf4j
public class AuthorizationService {

    @org.springframework.beans.factory.annotation.Value("${admin.emails:}")
    private java.util.List<String> adminEmails;

    private final UserRepository userRepository;
    private final PurchaseRepository purchaseRepository;
    private final StreakRepository streakRepository;
    private final NotificationRepository notificationRepository;
    private final UserProductRatingRepository ratingRepository;

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return auth.getName();
    }

    private String currentUserId() {
        String email = currentEmail();
        if (email == null) return null;
        return userRepository.findByEmail(email).map(u -> u.getId()).orElse(null);
    }

    public boolean isSelf(String userId) {
        String currentId = currentUserId();
        boolean ok = currentId != null && currentId.equals(userId);
        if (!ok) log.warn("isSelf=false (current={}, target={})", currentId, userId);
        return ok;
    }

    public boolean isAdmin() {
        String email = currentEmail();
        if (email == null) return false;
        return adminEmails.contains(email);
    }

    public boolean isPurchaseOwner(Long purchaseId) {
        String currentId = currentUserId();
        if (currentId == null) return false;
        return purchaseRepository.findById(purchaseId)
                .map(p -> p.getUser().getId().equals(currentId))
                .orElse(false);
    }

    public boolean isStreakOwner(Long streakId) {
        String currentId = currentUserId();
        if (currentId == null) return false;
        return streakRepository.findById(streakId)
                .map(s -> s.getUser().getId().equals(currentId))
                .orElse(false);
    }

    public boolean isNotificationOwner(Long notificationId) {
        String currentId = currentUserId();
        if (currentId == null) return false;
        return notificationRepository.findById(notificationId)
                .map(n -> n.getUser().getId().equals(currentId))
                .orElse(false);
    }

    public boolean isRatingOwner(Long ratingId) {
        String currentId = currentUserId();
        if (currentId == null) return false;
        return ratingRepository.findById(ratingId)
                .map(r -> r.getUser().getId().equals(currentId))
                .orElse(false);
    }
}
