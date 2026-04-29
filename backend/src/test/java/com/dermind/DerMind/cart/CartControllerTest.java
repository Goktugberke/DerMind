package com.dermind.DerMind.cart;

import com.dermind.DerMind.cart.controller.CartController;
import com.dermind.DerMind.cart.dto.CartItemAddDTO;
import com.dermind.DerMind.cart.dto.CartItemResponseDTO;
import com.dermind.DerMind.cart.service.CartService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CartController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class CartControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean CartService cartService;
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

    // ── GET /api/cart ──────────────────────────────────────────────────────

    @Test
    void getCart_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getCart_authenticated_returnsCartItems() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.getCart("uid-1")).thenReturn(List.of(new CartItemResponseDTO(1L, null, 2)));

        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].quantity").value(2));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getCart_authenticated_emptyCart_returnsEmptyList() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.getCart("uid-1")).thenReturn(List.of());

        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── POST /api/cart/add ─────────────────────────────────────────────────

    @Test
    void addItem_anonymous_returns403() throws Exception {
        String body = objectMapper.writeValueAsString(new CartItemAddDTO(1L, 2));
        mockMvc.perform(post("/api/cart/add").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void addItem_validRequest_returns201() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.addItem(eq("uid-1"), eq(1L), eq(2))).thenReturn(new CartItemResponseDTO(10L, null, 2));

        String body = objectMapper.writeValueAsString(new CartItemAddDTO(1L, 2));
        mockMvc.perform(post("/api/cart/add").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void addItem_missingProductId_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String body = "{\"quantity\":2}";
        mockMvc.perform(post("/api/cart/add").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void addItem_quantityZero_returns400() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));

        String body = objectMapper.writeValueAsString(new CartItemAddDTO(1L, 0));
        mockMvc.perform(post("/api/cart/add").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void addItem_productNotFound_returns404() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.addItem(anyString(), anyLong(), anyInt()))
                .thenThrow(new ResourceNotFoundException("Product", "id", 99L));

        String body = objectMapper.writeValueAsString(new CartItemAddDTO(99L, 1));
        mockMvc.perform(post("/api/cart/add").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    // ── PUT /api/cart/item/{productId} ────────────────────────────────────

    @Test
    void updateQuantity_anonymous_returns403() throws Exception {
        mockMvc.perform(put("/api/cart/item/1").with(csrf()).param("quantity", "3"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void updateQuantity_valid_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.updateQuantity("uid-1", 1L, 3)).thenReturn(new CartItemResponseDTO(1L, null, 3));

        mockMvc.perform(put("/api/cart/item/1").with(csrf()).param("quantity", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(3));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void updateQuantity_zeroQuantity_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.updateQuantity("uid-1", 1L, 0)).thenReturn(null);

        mockMvc.perform(put("/api/cart/item/1").with(csrf()).param("quantity", "0"))
                .andExpect(status().isNoContent());
    }

    // ── DELETE /api/cart/item/{productId} ─────────────────────────────────

    @Test
    void removeItem_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/cart/item/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void removeItem_authenticated_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        doNothing().when(cartService).removeItem("uid-1", 1L);

        mockMvc.perform(delete("/api/cart/item/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    // ── DELETE /api/cart ──────────────────────────────────────────────────

    @Test
    void clearCart_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/cart").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void clearCart_authenticated_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        doNothing().when(cartService).clearCart("uid-1");

        mockMvc.perform(delete("/api/cart").with(csrf()))
                .andExpect(status().isNoContent());
    }

    // ── POST /api/cart/merge ──────────────────────────────────────────────

    @Test
    void mergeCart_anonymous_returns403() throws Exception {
        mockMvc.perform(post("/api/cart/merge").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void mergeCart_emptyList_returnsCurrentCart() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(cartService.mergeCart(eq("uid-1"), any())).thenReturn(List.of());

        mockMvc.perform(post("/api/cart/merge").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
