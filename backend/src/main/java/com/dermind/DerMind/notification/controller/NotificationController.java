package com.dermind.DerMind.notification.controller;

import com.dermind.DerMind.notification.dto.NotificationResponseDTO;
import com.dermind.DerMind.notification.service.NotificationService;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Validated
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponseDTO>> getMyNotifications(@CurrentUser User user) {
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@CurrentUser User user) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user.getId())));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("@authz.isNotificationOwner(#id)")
    public ResponseEntity<Void> markAsRead(@CurrentUser User user, @PathVariable Long id) {
        notificationService.markAsRead(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@CurrentUser User user) {
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@authz.isNotificationOwner(#id)")
    public ResponseEntity<Void> deleteNotification(@CurrentUser User user, @PathVariable Long id) {
        notificationService.deleteNotification(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
