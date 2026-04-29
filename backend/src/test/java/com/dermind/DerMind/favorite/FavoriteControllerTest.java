package com.dermind.DerMind.favorite;

import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.favorite.controller.FavoriteController;
import com.dermind.DerMind.favorite.dto.FavoriteResponseDTO;
import com.dermind.DerMind.favorite.service.FavoriteService;
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

@WebMvcTest(FavoriteController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class FavoriteControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean FavoriteService favoriteService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean FirebaseTokenFilter firebaseTokenFilter;
    @MockitoBean RateLimitFilter rateLimitFilter;
    @MockitoBean IdempotencyFilter idempotencyFilter;
    @MockitoBean AuthorizationService authorizationService;

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

    private FavoriteResponseDTO makeFavorite(Long id) {
        return FavoriteResponseDTO.builder()
                .id(id)
                .product(null)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── POST /api/favorites/{productId} ──────────────────────────────────

    @Test
    void addFavorite_anonymous_returns403() throws Exception {
        mockMvc.perform(post("/api/favorites/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void addFavorite_authenticated_returns201() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(favoriteService.addFavorite("uid-1", 1L)).thenReturn(makeFavorite(10L));

        mockMvc.perform(post("/api/favorites/1").with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void addFavorite_duplicate_returnsConflict() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(favoriteService.addFavorite("uid-1", 1L))
                .thenThrow(new BusinessException("Bu ürün zaten favorilerde"));

        mockMvc.perform(post("/api/favorites/1").with(csrf()))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /api/favorites/{productId} ─────────────────────────────────

    @Test
    void removeFavorite_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/favorites/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void removeFavorite_authenticated_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        doNothing().when(favoriteService).removeFavorite("uid-1", 1L);

        mockMvc.perform(delete("/api/favorites/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    // ── GET /api/favorites/my-favorites ──────────────────────────────────

    @Test
    void getMyFavorites_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/favorites/my-favorites"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyFavorites_authenticated_returnsList() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(favoriteService.getMyFavorites("uid-1")).thenReturn(List.of(makeFavorite(1L), makeFavorite(2L)));

        mockMvc.perform(get("/api/favorites/my-favorites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyFavorites_emptyList_returnsEmptyArray() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(favoriteService.getMyFavorites("uid-1")).thenReturn(List.of());

        mockMvc.perform(get("/api/favorites/my-favorites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── GET /api/favorites/check/{productId} ─────────────────────────────

    @Test
    void checkIsFavorite_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/favorites/check/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void checkIsFavorite_isInFavorites_returnsTrue() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(favoriteService.checkIsFavorite("uid-1", 1L)).thenReturn(true);

        mockMvc.perform(get("/api/favorites/check/1"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void checkIsFavorite_notInFavorites_returnsFalse() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(favoriteService.checkIsFavorite("uid-1", 99L)).thenReturn(false);

        mockMvc.perform(get("/api/favorites/check/99"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }
}
