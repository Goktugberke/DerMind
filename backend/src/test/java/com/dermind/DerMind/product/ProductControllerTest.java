package com.dermind.DerMind.product;

import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.product.controller.ProductController;
import com.dermind.DerMind.product.dto.ProductCreateDTO;
import com.dermind.DerMind.product.dto.ProductDetailDTO;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.service.ProductService;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.security.FirebaseTokenFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProductController.class)
@Import(SecurityConfig.class)
class ProductControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean ProductService productService;
    @MockitoBean FirebaseTokenFilter firebaseTokenFilter;

    private ProductResponseDTO makeResponse(Long id, String name, String brand) {
        return new ProductResponseDTO(id, name, brand, null, null, null, null, null, null, null, null, null);
    }

    // ── GET /api/products ──────────────────────────────────────────────

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

    // ── GET /api/products/{id} ─────────────────────────────────────────

    @Test
    @WithMockUser
    void getProductById_existingProduct_returnsOk() throws Exception {
        ProductDetailDTO detail = new ProductDetailDTO(1L, "Toner", "COSRX", "Niacinamide", 9.0, 4.5, 10, 3, null);
        when(productService.getProductById(1L)).thenReturn(detail);

        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Toner"))
                .andExpect(jsonPath("$.averageUserRating").value(4.5));
    }

    @Test
    @WithMockUser
    void getProductById_notFound_returns404() throws Exception {
        when(productService.getProductById(99L))
                .thenThrow(new ResourceNotFoundException("Product", "id", 99L));

        mockMvc.perform(get("/api/products/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    // ── POST /api/products ─────────────────────────────────────────────

    @Test
    @WithMockUser
    void createProduct_validBody_returns201() throws Exception {
        ProductCreateDTO dto = ProductCreateDTO.builder()
                .name("Serum")
                .brand("The Ordinary")
                .ingredients("Niacinamide 10%, Zinc 1%")
                .qualityScore(8.0)
                .sephoraProductId("P123456")
                .build();

        when(productService.createProduct(any())).thenReturn(
                new ProductResponseDTO(10L, "Serum", "The Ordinary", "Niacinamide 10%, Zinc 1%", 8.0, null, null, "P123456", null, null, null, null)
        );

        mockMvc.perform(post("/api/products")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("Serum"));
    }

    @Test
    @WithMockUser
    void createProduct_missingName_returns400() throws Exception {
        String badBody = """
                {"brand":"X","ingredients":"Y","qualityScore":5.0}
                """;

        mockMvc.perform(post("/api/products")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // ── DELETE /api/products/{id} ──────────────────────────────────────

    @Test
    @WithMockUser
    void deleteProduct_existing_returns204() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/products/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void deleteProduct_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Product", "id", 99L))
                .when(productService).deleteProduct(99L);

        mockMvc.perform(delete("/api/products/99").with(csrf()))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/products/search ───────────────────────────────────────

    @Test
    @WithMockUser
    void searchProducts_returnsMatchingProducts() throws Exception {
        Page<ProductResponseDTO> page = new PageImpl<>(List.of(makeResponse(2L, "Toner Pad", "COSRX")));
        when(productService.searchProducts(eq("toner"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/products/search").param("query", "toner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Toner Pad"));
    }
}
