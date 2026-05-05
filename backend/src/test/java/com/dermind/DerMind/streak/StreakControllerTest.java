package com.dermind.DerMind.streak;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.security.CurrentUserArgumentResolver;
import com.dermind.DerMind.security.FirebaseTokenFilter;
import com.dermind.DerMind.streak.controller.StreakController;
import com.dermind.DerMind.streak.dto.StreakCreateDTO;
import com.dermind.DerMind.streak.dto.StreakResponseDTO;
import com.dermind.DerMind.streak.service.StreakService;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StreakController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class StreakControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean StreakService streakService;
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

    private StreakResponseDTO makeStreak(Long id) {
        return StreakResponseDTO.builder()
                .id(id)
                .userId("uid-1")
                .productId(1L)
                .currentStreak(5)
                .isActive(true)
                .usageFrequency(UsageFrequency.DAILY)
                .build();
    }

    // ── POST /api/streaks ──────────────────────────────────────────────────

    @Test
    void createStreak_anonymous_returns403() throws Exception {
        mockMvc.perform(post("/api/streaks").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createStreak_validRequest_returns201() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(streakService.createStreak(eq("uid-1"), any(StreakCreateDTO.class))).thenReturn(makeStreak(10L));

        StreakCreateDTO dto = StreakCreateDTO.builder()
                .productId(1L)
                .usageFrequency(UsageFrequency.DAILY)
                .build();

        mockMvc.perform(post("/api/streaks").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.currentStreak").value(5));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createStreak_missingUsageFrequency_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String badBody = "{\"productId\":1}";
        mockMvc.perform(post("/api/streaks").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createStreak_missingProductId_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String badBody = "{\"usageFrequency\":\"DAILY\"}";
        mockMvc.perform(post("/api/streaks").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/streaks/my-streaks ────────────────────────────────────────

    @Test
    void getMyStreaks_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/streaks/my-streaks"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyStreaks_authenticated_returnsList() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(streakService.getStreaksByUserId("uid-1")).thenReturn(List.of(makeStreak(1L), makeStreak(2L)));

        mockMvc.perform(get("/api/streaks/my-streaks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    // ── GET /api/streaks/my-streaks/active ────────────────────────────────

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyActiveStreaks_returnsActiveOnly() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(streakService.getActiveStreaksByUserId("uid-1")).thenReturn(List.of(makeStreak(1L)));

        mockMvc.perform(get("/api/streaks/my-streaks/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].isActive").value(true));
    }

    // ── POST /api/streaks/{id}/use ─────────────────────────────────────────

    @Test
    void recordUsage_anonymous_returns403() throws Exception {
        mockMvc.perform(post("/api/streaks/1/use").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void recordUsage_authenticated_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        StreakResponseDTO updated = makeStreak(1L);
        updated.setCurrentStreak(6);
        when(streakService.recordUsage("uid-1", 1L)).thenReturn(updated);

        mockMvc.perform(post("/api/streaks/1/use").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStreak").value(6));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void recordUsage_streakNotFound_returns404() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(streakService.recordUsage("uid-1", 99L))
                .thenThrow(new ResourceNotFoundException("Streak", "id", 99L));

        mockMvc.perform(post("/api/streaks/99/use").with(csrf()))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/streaks/{id} (ownership or ADMIN) ────────────────────────

    @Test
    void getStreakById_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/streaks/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getStreakById_owner_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isStreakOwner(1L)).thenReturn(true);
        when(streakService.getStreakById(1L)).thenReturn(makeStreak(1L));

        mockMvc.perform(get("/api/streaks/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getStreakById_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isStreakOwner(1L)).thenReturn(false);

        mockMvc.perform(get("/api/streaks/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getStreakById_admin_returns200() throws Exception {
        when(streakService.getStreakById(1L)).thenReturn(makeStreak(1L));

        mockMvc.perform(get("/api/streaks/1"))
                .andExpect(status().isOk());
    }

    // ── DELETE /api/streaks/{id} (ownership only) ─────────────────────────

    @Test
    void deleteStreak_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/streaks/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteStreak_owner_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isStreakOwner(1L)).thenReturn(true);
        doNothing().when(streakService).deleteStreak(1L);

        mockMvc.perform(delete("/api/streaks/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteStreak_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isStreakOwner(1L)).thenReturn(false);

        mockMvc.perform(delete("/api/streaks/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/streaks/all (ADMIN only) ─────────────────────────────────

    @Test
    void getAllStreaks_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/streaks/all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getAllStreaks_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/streaks/all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getAllStreaks_admin_returnsList() throws Exception {
        when(streakService.getAllStreaks()).thenReturn(List.of(makeStreak(1L), makeStreak(2L)));

        mockMvc.perform(get("/api/streaks/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }
}
