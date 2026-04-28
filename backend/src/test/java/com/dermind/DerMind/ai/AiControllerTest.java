package com.dermind.DerMind.ai;

import com.dermind.DerMind.ai.controller.AiController;
import com.dermind.DerMind.ai.service.AiServerClient;
import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
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

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class AiControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean AiServerClient aiServerClient;
    @MockitoBean ProductRepository productRepository;
    @MockitoBean UserProductRatingRepository ratingRepository;
    @MockitoBean UserRepository userRepository;
    @MockitoBean FirebaseTokenFilter firebaseTokenFilter;
    @MockitoBean RateLimitFilter rateLimitFilter;
    @MockitoBean IdempotencyFilter idempotencyFilter;
    @MockitoBean AuthorizationService authorizationService;

    @BeforeEach
    void passThroughFilters() throws Exception {
        doAnswer(inv -> {
            FilterChain chain = inv.getArgument(2);
            chain.doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(firebaseTokenFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));

        doAnswer(inv -> {
            FilterChain chain = inv.getArgument(2);
            chain.doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(rateLimitFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));

        doAnswer(inv -> {
            FilterChain chain = inv.getArgument(2);
            chain.doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(idempotencyFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
    }

    @Test
    void aiHealth_permitAll_returnsOk() throws Exception {
        when(aiServerClient.isHealthy()).thenReturn(true);
        mockMvc.perform(get("/api/ai/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ai_server_status").value("UP"));
    }

    @Test
    void aiHealth_whenAiServerDown_returnsDownStatus() throws Exception {
        when(aiServerClient.isHealthy()).thenReturn(false);
        mockMvc.perform(get("/api/ai/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ai_server_status").value("DOWN"));
    }

    @Test
    void getScore_withoutAuth_returns403() throws Exception {
        // Anonymous user → Spring Security default 403 (authenticated() rule)
        mockMvc.perform(get("/api/ai/score/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void getScore_authenticatedUserNotInDb_returns401() throws Exception {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/ai/score/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void getScore_productNotFound_returns404() throws Exception {
        User user = new User();
        user.setId("uid-1");
        user.setEmail("user@example.com");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/ai/score/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getRecommendations_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/api/ai/recommend"))
                .andExpect(status().isForbidden());
    }

    @Test
    void explainScore_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/api/ai/explain/1"))
                .andExpect(status().isForbidden());
    }
}
