package com.dermind.DerMind.notification.controller;

import com.dermind.DerMind.error.UserNotAuthenticatedException;
import com.dermind.DerMind.notification.dto.NotificationResponseDTO;
import com.dermind.DerMind.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Canlıda kendi domaininle değiştir
public class NotificationController {

    private final NotificationService notificationService;

    // Kullanıcının tüm bildirimlerini getir
    @GetMapping
    public ResponseEntity<List<NotificationResponseDTO>> getMyNotifications(@AuthenticationPrincipal OidcUser principal) {
        String userId = getUserId(principal);
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    // Okunmamış bildirim sayısı (Uygulama ikonunda kırmızı sayı göstermek için)
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal OidcUser principal) {
        String userId = getUserId(principal);
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    // Bildirimi okundu olarak işaretle
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@AuthenticationPrincipal OidcUser principal, @PathVariable Long id) {
        String userId = getUserId(principal);
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok().build();
    }

    private String getUserId(OidcUser principal) {
        if (principal == null) {
            throw new UserNotAuthenticatedException("Giriş yapmalısınız.");
        }
        return principal.getSubject();
    }
}