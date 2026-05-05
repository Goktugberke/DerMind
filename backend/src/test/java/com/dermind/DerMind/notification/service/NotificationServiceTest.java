package com.dermind.DerMind.notification.service;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.notification.dto.NotificationResponseDTO;
import com.dermind.DerMind.notification.model.Notification;
import com.dermind.DerMind.notification.repository.NotificationRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;

    @InjectMocks NotificationService notificationService;

    private User makeUser(String id) {
        User u = new User();
        u.setId(id);
        u.setName("Test User");
        return u;
    }

    private Notification makeNotification(Long id, User user, boolean read) {
        return Notification.builder()
                .id(id)
                .user(user)
                .title("Test Title")
                .message("Test Message")
                .type(NotificationType.ROUTINE_REMINDER)
                .isRead(read)
                .build();
    }

    // ── createNotification ───────────────────────────────────────────────

    @Test
    @DisplayName("createNotification: kullanıcı yoksa ResourceNotFoundException")
    void createNotification_userNotFound_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.createNotification(
                "missing", "Title", "Msg", NotificationType.ROUTINE_REMINDER, null))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("createNotification: geçerli kullanıcı → bildirim kaydedilir")
    void createNotification_valid_saves() {
        User user = makeUser("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        notificationService.createNotification("u1", "Title", "Msg",
                NotificationType.ROUTINE_REMINDER, 10L);

        verify(notificationRepository).save(argThat(n ->
                n.getUser().getId().equals("u1") &&
                "Title".equals(n.getTitle()) &&
                !n.isRead()
        ));
    }

    // ── markAsRead ────────────────────────────────────────────────────────

    @Test
    @DisplayName("markAsRead: bildirim yoksa ResourceNotFoundException")
    void markAsRead_notFound_throws() {
        when(notificationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> notificationService.markAsRead("u1", 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("markAsRead: başka kullanıcının bildirimi → UnauthorizedAccessException")
    void markAsRead_wrongUser_throws() {
        User owner = makeUser("owner");
        Notification notif = makeNotification(1L, owner, false);
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notif));

        assertThatThrownBy(() -> notificationService.markAsRead("attacker", 1L))
                .isInstanceOf(UnauthorizedAccessException.class);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("markAsRead: kendi bildirimi → isRead=true olarak kaydedilir")
    void markAsRead_ownNotification_setsReadTrue() {
        User user = makeUser("u1");
        Notification notif = makeNotification(1L, user, false);
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notif));

        notificationService.markAsRead("u1", 1L);

        assertThat(notif.isRead()).isTrue();
        verify(notificationRepository).save(notif);
    }

    // ── markAllAsRead ─────────────────────────────────────────────────────

    @Test
    @DisplayName("markAllAsRead: okunmamış tüm bildirimler okundu yapılır")
    void markAllAsRead_marksAllUnread() {
        User user = makeUser("u1");
        Notification n1 = makeNotification(1L, user, false);
        Notification n2 = makeNotification(2L, user, false);
        when(notificationRepository.findByUserIdAndIsReadFalse("u1")).thenReturn(List.of(n1, n2));

        notificationService.markAllAsRead("u1");

        assertThat(n1.isRead()).isTrue();
        assertThat(n2.isRead()).isTrue();
        verify(notificationRepository).saveAll(List.of(n1, n2));
    }

    @Test
    @DisplayName("markAllAsRead: okunmamış bildirim yoksa saveAll çağrılmaz")
    void markAllAsRead_noUnread_doesNothing() {
        when(notificationRepository.findByUserIdAndIsReadFalse("u1")).thenReturn(List.of());

        notificationService.markAllAsRead("u1");

        verify(notificationRepository).saveAll(List.of());
    }

    // ── deleteNotification ────────────────────────────────────────────────

    @Test
    @DisplayName("deleteNotification: bildirim yoksa ResourceNotFoundException")
    void deleteNotification_notFound_throws() {
        when(notificationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> notificationService.deleteNotification("u1", 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteNotification: başka kullanıcının bildirimi → UnauthorizedAccessException")
    void deleteNotification_wrongUser_throws() {
        User owner = makeUser("owner");
        Notification notif = makeNotification(1L, owner, false);
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notif));

        assertThatThrownBy(() -> notificationService.deleteNotification("attacker", 1L))
                .isInstanceOf(UnauthorizedAccessException.class);
        verify(notificationRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteNotification: kendi bildirimi → delete çağrılır")
    void deleteNotification_ownNotification_deletes() {
        User user = makeUser("u1");
        Notification notif = makeNotification(1L, user, false);
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notif));

        notificationService.deleteNotification("u1", 1L);

        verify(notificationRepository).delete(notif);
    }

    // ── getUserNotifications ───────────────────────────────────────────────

    @Test
    @DisplayName("getUserNotifications: bildirim listesi dönüşüm testi")
    void getUserNotifications_returnsMappedList() {
        User user = makeUser("u1");
        Notification n1 = makeNotification(1L, user, false);
        Notification n2 = makeNotification(2L, user, true);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc("u1"))
                .thenReturn(List.of(n1, n2));

        List<NotificationResponseDTO> result = notificationService.getUserNotifications("u1");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(1).isRead()).isTrue();
    }

    // ── getUnreadCount ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getUnreadCount: repository'ye delegasyon")
    void getUnreadCount_delegates() {
        when(notificationRepository.countByUserIdAndIsReadFalse("u1")).thenReturn(5L);
        assertThat(notificationService.getUnreadCount("u1")).isEqualTo(5L);
    }
}
