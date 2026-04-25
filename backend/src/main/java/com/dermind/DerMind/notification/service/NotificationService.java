package com.dermind.DerMind.notification.service;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.notification.dto.NotificationResponseDTO;
import com.dermind.DerMind.notification.model.Notification;
import com.dermind.DerMind.notification.repository.NotificationRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // 1. Bildirim Oluştur (Bunu Controller'dan değil, diğer Servislerden
    // çağıracaksın)
    @Transactional
    public void createNotification(String userId, String title, String message, NotificationType type,
            Long relatedEntityId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .relatedEntityId(relatedEntityId)
                .isRead(false)
                .build();

        notificationRepository.save(notification);

        // NOT: Buraya ileride Firebase/OneSignal kodu ekleyerek telefona push bildirimi
        // de atabilirsin.
    }

    // 2. Kullanıcının Bildirimlerini Getir
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> getUserNotifications(String userId) {
        // Repository'de "findByUserIdOrderByCreatedAtDesc" metodu olmalı
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // 3. Bildirimi Okundu İşaretle (Güvenli IDOR kontrolü ile)
    @Transactional
    public void markAsRead(String userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new UnauthorizedAccessException("Bu bildirime erişim yetkiniz yok.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    // 4. Okunmamış Bildirim Sayısı (Badge için)
    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // 5. Tüm bildirimleri okundu işaretle
    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    // 6. Bildirimi sil (sahiplik kontrolü ile)
    @Transactional
    public void deleteNotification(String userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new UnauthorizedAccessException("Bu bildirime erişim yetkiniz yok.");
        }

        notificationRepository.delete(notification);
    }

    private NotificationResponseDTO mapToDTO(Notification notification) {
        return NotificationResponseDTO.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .relatedEntityId(notification.getRelatedEntityId())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}