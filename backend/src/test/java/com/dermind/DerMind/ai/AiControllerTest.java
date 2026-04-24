package com.dermind.DerMind.ai;

import com.dermind.DerMind.ai.controller.AiController;
import com.dermind.DerMind.ai.service.AiServerClient;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.security.CustomOAuth2UserService;
import com.dermind.DerMind.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AiController.class)
@Import(SecurityConfig.class)
class AiControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean AiServerClient aiServerClient;
    @MockitoBean ProductRepository productRepository;
    @MockitoBean UserRepository userRepository;
    @MockitoBean CustomOAuth2UserService customOAuth2UserService;

    // ── GET /api/ai/health ─────────────────────────────────────────────

    @Test
    void aiHealth_permitAll_returnsOk() throws Exception {
        // /api/ai/health is permitAll — no auth needed
        org.mockito.Mockito.when(aiServerClient.isHealthy()).thenReturn(true);

        mockMvc.perform(get("/api/ai/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ai_server_status").value("UP"));
    }

    @Test
    void aiHealth_whenAiServerDown_returnsDownStatus() throws Exception {
        org.mockito.Mockito.when(aiServerClient.isHealthy()).thenReturn(false);

        mockMvc.perform(get("/api/ai/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ai_server_status").value("DOWN"));
    }

    // ── GET /api/ai/score/{productId} ──────────────────────────────────

    @Test
    void getScore_withoutAuth_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/api/ai/score/1"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    @WithMockUser
    void getScore_productNotFound_returns404() throws Exception {
        org.mockito.Mockito.when(productRepository.findById(99L))
                .thenReturn(java.util.Optional.empty());

        mockMvc.perform(get("/api/ai/score/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getScore_authenticatedButNoOidcSession_returns401() throws Exception {
        // @WithMockUser gives UsernamePasswordAuthenticationToken, not OidcUser —
        // getCurrentUser() catches UserNotAuthenticatedException and returns null → 401
        org.mockito.Mockito.when(productRepository.findById(1L))
                .thenReturn(java.util.Optional.of(buildProductWithSephoraId("P123")));

        mockMvc.perform(get("/api/ai/score/1"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/ai/recommend ──────────────────────────────────────────

    @Test
    void getRecommendations_withoutAuth_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/api/ai/recommend"))
                .andExpect(status().is3xxRedirection());
    }

    // ── GET /api/ai/explain/{productId} ───────────────────────────────

    @Test
    void explainScore_withoutAuth_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/api/ai/explain/1"))
                .andExpect(status().is3xxRedirection());
    }

    // ── helper ────────────────────────────────────────────────────────

    private com.dermind.DerMind.product.model.Product buildProductWithSephoraId(String sephoraId) {
        com.dermind.DerMind.product.model.Product p = new com.dermind.DerMind.product.model.Product();
        p.setId(1L);
        p.setName("Test Product");
        p.setBrand("TestBrand");
        p.setSephoraProductId(sephoraId);
        return p;
    }
}
