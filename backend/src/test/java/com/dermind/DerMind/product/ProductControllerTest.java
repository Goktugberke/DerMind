package com.dermind.DerMind.product;

import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.controller.ProductController;
import com.dermind.DerMind.product.dto.ProductCreateDTO;
import com.dermind.DerMind.product.dto.ProductDetailDTO;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.service.ProductService;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.security.CurrentUserArgumentResolver;
import com.dermind.DerMind.security.FirebaseTokenFilter;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class ProductControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean ProductService productService;
    @MockitoBean FirebaseTokenFilter firebaseTokenFilter;
    @MockitoBean RateLimitFilter rateLimitFilter;
    @MockitoBean IdempotencyFilter idempotencyFilter;
    @MockitoBean AuthorizationService authorizationService;
    @MockitoBean UserRepository userRepository;

    @BeforeEach
    void passThroughFilters() throws Exception {
        // Filter mock'ları default olarak chain'i ilerletmiyor; pass-through stub'la
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

    private ProductResponseDTO makeResponse(Long id, String name, String brand) {
        return new ProductResponseDTO(id, name, brand, null, null, null, null, null, null, null, null, null);
    }

    @Test
    void getAllProducts_anonymousAccess_returnsOk() throws Exception {
        Page<ProductResponseDTO> page = new PageImpl<>(List.of(makeResponse(1L, "Moisturizer", "LANEIGE")));
        when(productService.getAllProducts(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Moisturizer"));
    }

    @Test
    @WithMockUser
    void getAllProducts_authenticated_returnsOkWithPage() throws Exception {
        Page<ProductResponseDTO> page = new PageImpl<>(List.of(makeResponse(1L, "Moisturizer", "LANEIGE")));
        when(productService.getAllProducts(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Moisturizer"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getProductById_anonymous_returnsOk() throws Exception {
        ProductDetailDTO detail = new ProductDetailDTO(1L, "Toner", "COSRX", "Niacinamide", 9.0, 4.5, 10, 3, null);
        when(productService.getProductById(1L)).thenReturn(detail);

        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Toner"))
                .andExpect(jsonPath("$.averageUserRating").value(4.5));
    }

    @Test
    void getProductById_notFound_returns404() throws Exception {
        when(productService.getProductById(99L))
                .thenThrow(new ResourceNotFoundException("Product", "id", 99L));

        mockMvc.perform(get("/api/products/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createProduct_adminWithValidBody_returns201() throws Exception {
        ProductCreateDTO dto = ProductCreateDTO.builder()
                .name("Serum").brand("The Ordinary").ingredients("Niacinamide 10%, Zinc 1%")
                .qualityScore(8.0).sephoraProductId("P123456")
                .build();

        when(productService.createProduct(any())).thenReturn(
                new ProductResponseDTO(10L, "Serum", "The Ordinary", "Niacinamide 10%, Zinc 1%", 8.0,
                        null, null, "P123456", null, null, null, null)
        );

        mockMvc.perform(post("/api/products").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("Serum"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void createProduct_nonAdmin_returns403() throws Exception {
        ProductCreateDTO dto = ProductCreateDTO.builder()
                .name("Serum").brand("X").ingredients("X").qualityScore(8.0).build();

        mockMvc.perform(post("/api/products").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createProduct_missingName_returns400() throws Exception {
        String badBody = """
                {"brand":"X","ingredients":"Y","qualityScore":5.0}
                """;
        mockMvc.perform(post("/api/products").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteProduct_admin_returns204() throws Exception {
        doNothing().when(productService).deleteProduct(1L);
        mockMvc.perform(delete("/api/products/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "USER")
    void deleteProduct_nonAdmin_returns403() throws Exception {
        mockMvc.perform(delete("/api/products/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteProduct_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Product", "id", 99L))
                .when(productService).deleteProduct(99L);
        mockMvc.perform(delete("/api/products/99").with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void searchProducts_returnsMatchingProducts() throws Exception {
        Page<ProductResponseDTO> page = new PageImpl<>(List.of(makeResponse(2L, "Toner Pad", "COSRX")));
        when(productService.searchProducts(eq("toner"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/products/search").param("query", "toner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Toner Pad"));
    }
}
