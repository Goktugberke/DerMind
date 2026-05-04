package com.dermind.DerMind.notification;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.notification.controller.NotificationController;
import com.dermind.DerMind.notification.dto.NotificationResponseDTO;
import com.dermind.DerMind.notification.service.NotificationService;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.security.CurrentUserArgumentResolver;
import com.dermind.DerMind.security.FirebaseTokenFilter;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class NotificationControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean NotificationService notificationService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean FirebaseTokenFilter firebaseTokenFilter;
    @MockitoBean RateLimitFilter rateLimitFilter;
    @MockitoBean IdempotencyFilter idempotencyFilter;
    @MockitoBean(name = "authz") AuthorizationService authorizationService;

    private User mockUser;

    @BeforeEach
    void setup() throws Exception {
        mockUser = new User();
        mockUser.setId("uid-1");
        mockUser.setEmail("user@test.com");

        doAnswer(inv -> { FilterChain c = inv.getArgument(2); c.doFilter(inv.getArgument(0), inv.getArgument(1)); return null; })
                .when(firebaseTokenFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
        doAnswer(inv -> { FilterChain c = inv.getArgument(2); c.doFilter(inv.getArgument(0), inv.getArgument(1)); return null; })
                .when(rateLimitFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
        doAnswer(inv -> { FilterChain c = inv.getArgument(2); c.doFilter(inv.getArgument(0), inv.getArgument(1)); return null; })
                .when(idempotencyFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
    }

    private NotificationResponseDTO makeNotification(Long id, boolean read) {
        return NotificationResponseDTO.builder()
                .id(id)
                .title("Test Notification")
                .message("Test message")
                .type(NotificationType.ROUTINE_REMINDER)
                .isRead(read)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── GET /api/notifications ─────────────────────────────────────────────

    @Test
    void getMyNotifications_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyNotifications_authenticated_returnsList() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(notificationService.getUserNotifications("uid-1"))
                .thenReturn(List.of(makeNotification(1L, false), makeNotification(2L, true)));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Test Notification"));
    }

    // ── GET /api/notifications/unread-count ──────────────────────────────

    @Test
    void getUnreadCount_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getUnreadCount_authenticated_returnsCount() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(notificationService.getUnreadCount("uid-1")).thenReturn(3L);

        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3));
    }

    // ── PUT /api/notifications/{id}/read ──────────────────────────────────

    @Test
    void markAsRead_anonymous_returns403() throws Exception {
        mockMvc.perform(put("/api/notifications/1/read").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void markAsRead_owner_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isNotificationOwner(1L)).thenReturn(true);
        doNothing().when(notificationService).markAsRead("uid-1", 1L);

        mockMvc.perform(put("/api/notifications/1/read").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void markAsRead_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isNotificationOwner(1L)).thenReturn(false);

        mockMvc.perform(put("/api/notifications/1/read").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ── PUT /api/notifications/read-all ───────────────────────────────────

    @Test
    void markAllAsRead_anonymous_returns403() throws Exception {
        mockMvc.perform(put("/api/notifications/read-all").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void markAllAsRead_authenticated_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        doNothing().when(notificationService).markAllAsRead("uid-1");

        mockMvc.perform(put("/api/notifications/read-all").with(csrf()))
                .andExpect(status().isNoContent());
    }

    // ── DELETE /api/notifications/{id} ────────────────────────────────────

    @Test
    void deleteNotification_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/notifications/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteNotification_owner_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isNotificationOwner(1L)).thenReturn(true);
        doNothing().when(notificationService).deleteNotification("uid-1", 1L);

        mockMvc.perform(delete("/api/notifications/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteNotification_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isNotificationOwner(1L)).thenReturn(false);

        mockMvc.perform(delete("/api/notifications/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteNotification_serviceThrows_returnsError() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isNotificationOwner(1L)).thenReturn(true);
        doThrow(new UnauthorizedAccessException("Not your notification"))
                .when(notificationService).deleteNotification("uid-1", 1L);

        mockMvc.perform(delete("/api/notifications/1").with(csrf()))
                .andExpect(status().isForbidden());
    }
}
