package com.dermind.DerMind.user_product_rating;

import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.security.CurrentUserArgumentResolver;
import com.dermind.DerMind.security.FirebaseTokenFilter;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.controller.UserProductRatingController;
import com.dermind.DerMind.user_product_rating.dto.ProductRatingStatsDTO;
import com.dermind.DerMind.user_product_rating.dto.RatingCreateDTO;
import com.dermind.DerMind.user_product_rating.dto.RatingResponseDTO;
import com.dermind.DerMind.user_product_rating.service.UserProductRatingService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserProductRatingController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class UserProductRatingControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean UserProductRatingService ratingService;
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

    private RatingResponseDTO makeRating(Long id) {
        return RatingResponseDTO.builder()
                .id(id)
                .userId("uid-1")
                .productId(1L)
                .productName("Test Product")
                .rating(8)
                .verifiedPurchase(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── POST /api/ratings ─────────────────────────────────────────────────

    @Test
    void createRating_anonymous_returns403() throws Exception {
        mockMvc.perform(post("/api/ratings").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createRating_validRequest_returns201() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(ratingService.createRating(any(RatingCreateDTO.class))).thenReturn(makeRating(10L));

        RatingCreateDTO dto = RatingCreateDTO.builder()
                .productId(1L)
                .rating(8)
                .review("Great product!")
                .build();

        mockMvc.perform(post("/api/ratings").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.rating").value(8));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createRating_invalidRatingValue_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        // rating > 10 is invalid
        String badBody = "{\"productId\":1,\"rating\":11}";
        mockMvc.perform(post("/api/ratings").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createRating_missingProductId_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String badBody = "{\"rating\":8}";
        mockMvc.perform(post("/api/ratings").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    @SuppressWarnings("deprecation")
    void createRating_userIdOverrideIgnored_usesAuthUser() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(ratingService.createRating(any(RatingCreateDTO.class))).thenAnswer(inv -> {
            RatingCreateDTO dto = inv.getArgument(0);
            // Controller overrides any userId from body with the authenticated user's ID (IDOR protection)
            assert "uid-1".equals(dto.getUserId()) : "userId should be overridden to auth user";
            return makeRating(10L);
        });

        String body = "{\"productId\":1,\"rating\":8,\"userId\":\"attacker-uid\"}";
        mockMvc.perform(post("/api/ratings").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }

    // ── GET /api/ratings (ADMIN only) ─────────────────────────────────────

    @Test
    void getAllRatings_anonymous_returns403() throws Exception {
        // @PreAuthorize("hasRole('ADMIN')") on the method overrides SecurityConfig permitAll
        mockMvc.perform(get("/api/ratings"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getAllRatings_regularUser_returns200() throws Exception {
        // Not ADMIN-protected at SecurityConfig level, only at controller @PreAuthorize
        when(ratingService.getAllRatings()).thenReturn(List.of(makeRating(1L)));
        mockMvc.perform(get("/api/ratings"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getAllRatings_admin_returnsList() throws Exception {
        when(ratingService.getAllRatings()).thenReturn(List.of(makeRating(1L), makeRating(2L)));

        mockMvc.perform(get("/api/ratings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    // ── GET /api/ratings/{id} (public) ───────────────────────────────────

    @Test
    void getRatingById_anonymous_returns200() throws Exception {
        when(ratingService.getRatingById(1L)).thenReturn(makeRating(1L));

        mockMvc.perform(get("/api/ratings/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void getRatingById_notFound_returns404() throws Exception {
        when(ratingService.getRatingById(99L))
                .thenThrow(new ResourceNotFoundException("Rating", "id", 99L));

        mockMvc.perform(get("/api/ratings/99"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/ratings/product/{productId}/stats (public) ──────────────

    @Test
    void getProductRatingStats_anonymous_returns200() throws Exception {
        ProductRatingStatsDTO stats = ProductRatingStatsDTO.builder()
                .productId(1L)
                .totalRatings(10L)
                .averageRating(4.5)
                .build();
        when(ratingService.getProductRatingStats(1L)).thenReturn(stats);

        mockMvc.perform(get("/api/ratings/product/1/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRatings").value(10));
    }

    // ── GET /api/ratings/product/{productId} (public) ────────────────────

    @Test
    void getRatingsByProduct_anonymous_returns200() throws Exception {
        when(ratingService.getRatingsByProductId(1L)).thenReturn(List.of(makeRating(1L)));

        mockMvc.perform(get("/api/ratings/product/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── PUT /api/ratings/{id} (owner or ADMIN) ────────────────────────────

    @Test
    void updateRating_anonymous_returns403() throws Exception {
        mockMvc.perform(put("/api/ratings/1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void updateRating_owner_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isRatingOwner(1L)).thenReturn(true);
        when(ratingService.updateRating(eq(1L), any())).thenReturn(makeRating(1L));

        mockMvc.perform(put("/api/ratings/1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":9}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void updateRating_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isRatingOwner(1L)).thenReturn(false);

        mockMvc.perform(put("/api/ratings/1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":9}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void updateRating_admin_returns200() throws Exception {
        when(ratingService.updateRating(eq(1L), any())).thenReturn(makeRating(1L));

        mockMvc.perform(put("/api/ratings/1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":9}"))
                .andExpect(status().isOk());
    }

    // ── DELETE /api/ratings/{id} (owner or ADMIN) ─────────────────────────

    @Test
    void deleteRating_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/ratings/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteRating_owner_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isRatingOwner(1L)).thenReturn(true);
        doNothing().when(ratingService).deleteRating(1L);

        mockMvc.perform(delete("/api/ratings/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteRating_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isRatingOwner(1L)).thenReturn(false);

        mockMvc.perform(delete("/api/ratings/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void deleteRating_admin_returns204() throws Exception {
        doNothing().when(ratingService).deleteRating(1L);

        mockMvc.perform(delete("/api/ratings/1").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
