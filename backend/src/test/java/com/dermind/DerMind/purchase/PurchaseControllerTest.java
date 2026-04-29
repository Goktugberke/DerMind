package com.dermind.DerMind.purchase;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.common.enums.PaymentMethod;
import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.purchase.controller.PurchaseController;
import com.dermind.DerMind.purchase.dto.PurchaseCreateDTO;
import com.dermind.DerMind.purchase.dto.PurchaseResponseDTO;
import com.dermind.DerMind.purchase.service.PurchaseService;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.security.CurrentUserArgumentResolver;
import com.dermind.DerMind.security.FirebaseTokenFilter;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PurchaseController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class PurchaseControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean PurchaseService purchaseService;
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

    private PurchaseResponseDTO makePurchaseResponse(Long id) {
        return PurchaseResponseDTO.builder()
                .id(id)
                .userId("uid-1")
                .productId(1L)
                .quantity(2)
                .unitPrice(new BigDecimal("50.00"))
                .totalPrice(new BigDecimal("100.00"))
                .orderStatus(OrderStatus.PENDING)
                .build();
    }

    // ── POST /api/purchases ────────────────────────────────────────────────

    @Test
    void createPurchase_anonymous_returns403() throws Exception {
        mockMvc.perform(post("/api/purchases").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createPurchase_validRequest_returns201() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(purchaseService.createPurchase(eq("uid-1"), any(PurchaseCreateDTO.class)))
                .thenReturn(makePurchaseResponse(10L));

        PurchaseCreateDTO dto = PurchaseCreateDTO.builder()
                .productId(1L).quantity(2)
                .unitPrice(new BigDecimal("50.00"))
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .shippingAddress("Test Street 1 12345 Istanbul")
                .build();

        mockMvc.perform(post("/api/purchases").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.orderStatus").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createPurchase_missingShippingAddress_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String badBody = """
                {"productId":1,"quantity":2,"unitPrice":50.00,"paymentMethod":"CREDIT_CARD"}
                """;
        mockMvc.perform(post("/api/purchases").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void createPurchase_quantityZero_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String badBody = """
                {"productId":1,"quantity":0,"unitPrice":50.00,"paymentMethod":"CREDIT_CARD","shippingAddress":"Test Address 12345"}
                """;
        mockMvc.perform(post("/api/purchases").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/purchases (ADMIN only) ───────────────────────────────────

    @Test
    void getAllPurchases_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/purchases"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getAllPurchases_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/purchases"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getAllPurchases_admin_returnsList() throws Exception {
        when(purchaseService.getAllPurchases())
                .thenReturn(List.of(makePurchaseResponse(1L), makePurchaseResponse(2L)));

        mockMvc.perform(get("/api/purchases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    // ── GET /api/purchases/my-purchases ───────────────────────────────────

    @Test
    void getMyPurchases_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/purchases/my-purchases"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyPurchases_authenticated_returnsList() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(purchaseService.getPurchasesByUserId("uid-1")).thenReturn(List.of(makePurchaseResponse(1L)));

        mockMvc.perform(get("/api/purchases/my-purchases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── GET /api/purchases/my-purchases/recent ────────────────────────────

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyRecentPurchases_returnsList() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(purchaseService.getRecentPurchasesByUserId("uid-1")).thenReturn(List.of(makePurchaseResponse(5L)));

        mockMvc.perform(get("/api/purchases/my-purchases/recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(5));
    }

    // ── GET /api/purchases/my-purchases/stats ─────────────────────────────

    @Test
    void getMyPurchaseStats_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/purchases/my-purchases/stats"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getMyPurchaseStats_authenticated_returnsStats() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(purchaseService.getTotalPurchaseCountByUserId("uid-1")).thenReturn(5L);
        when(purchaseService.getTotalSpendingByUserId("uid-1")).thenReturn(250.00);

        mockMvc.perform(get("/api/purchases/my-purchases/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPurchases").value(5))
                .andExpect(jsonPath("$.totalSpending").value(250.00));
    }

    // ── GET /api/purchases/{id} (ownership or ADMIN) ──────────────────────

    @Test
    void getPurchaseById_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/purchases/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getPurchaseById_owner_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isPurchaseOwner(1L)).thenReturn(true);
        when(purchaseService.getPurchaseById("uid-1", 1L)).thenReturn(makePurchaseResponse(1L));

        mockMvc.perform(get("/api/purchases/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getPurchaseById_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isPurchaseOwner(1L)).thenReturn(false);

        mockMvc.perform(get("/api/purchases/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getPurchaseById_admin_returns200() throws Exception {
        User adminUser = new User();
        adminUser.setId("admin-1");
        adminUser.setEmail("admin@test.com");
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(purchaseService.getPurchaseById("admin-1", 1L)).thenReturn(makePurchaseResponse(1L));

        mockMvc.perform(get("/api/purchases/1"))
                .andExpect(status().isOk());
    }

    // ── GET /api/purchases/status/{orderStatus} (ADMIN only) ─────────────

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getPurchasesByStatus_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/purchases/status/PENDING"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getPurchasesByStatus_admin_returnsList() throws Exception {
        when(purchaseService.getPurchasesByOrderStatus(OrderStatus.PENDING))
                .thenReturn(List.of(makePurchaseResponse(1L)));

        mockMvc.perform(get("/api/purchases/status/PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── DELETE /api/purchases/{id} ─────────────────────────────────────────

    @Test
    void deletePurchase_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/purchases/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deletePurchase_owner_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isPurchaseOwner(1L)).thenReturn(true);
        doNothing().when(purchaseService).deletePurchase(1L);

        mockMvc.perform(delete("/api/purchases/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deletePurchase_notOwner_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isPurchaseOwner(1L)).thenReturn(false);

        mockMvc.perform(delete("/api/purchases/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void deletePurchase_admin_returns204() throws Exception {
        doNothing().when(purchaseService).deletePurchase(1L);

        mockMvc.perform(delete("/api/purchases/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void deletePurchase_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Purchase", "id", 99L))
                .when(purchaseService).deletePurchase(99L);

        mockMvc.perform(delete("/api/purchases/99").with(csrf()))
                .andExpect(status().isNotFound());
    }
}
