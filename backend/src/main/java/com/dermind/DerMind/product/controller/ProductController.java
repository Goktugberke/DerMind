package com.dermind.DerMind.product.controller;

import com.dermind.DerMind.product.dto.*;
import com.dermind.DerMind.product.service.ProductService;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Validated
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<Page<ProductResponseDTO>> getAllProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getAllProducts(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailDTO> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponseDTO> createProduct(@Valid @RequestBody ProductCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponseDTO> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateDTO dto) {
        return ResponseEntity.ok(productService.updateProduct(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/brand/{brand}")
    public ResponseEntity<Page<ProductResponseDTO>> getProductsByBrand(
            @PathVariable String brand, Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByBrand(brand, pageable));
    }

    /**
     * Search products by name OR brand. Tek doğru search endpoint.
     * GET /api/products/search?query=...
     */
    @GetMapping("/search")
    public ResponseEntity<Page<ProductResponseDTO>> searchProducts(
            @RequestParam String query, Pageable pageable) {
        return ResponseEntity.ok(productService.searchProducts(query, pageable));
    }

    @GetMapping("/filter")
    public ResponseEntity<Page<ProductResponseDTO>> filterProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Double minQuality,
            Pageable pageable) {
        return ResponseEntity.ok(productService.filterProducts(query, minPrice, maxPrice, minQuality, pageable));
    }

    @GetMapping("/quality")
    public ResponseEntity<Page<ProductResponseDTO>> getProductsByMinQuality(
            @RequestParam(defaultValue = "0.0") Double min, Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByMinQuality(min, pageable));
    }

    @GetMapping("/top/quality")
    public ResponseEntity<List<ProductDetailDTO>> getTopQualityProducts(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(productService.getTopQualityProducts(limit));
    }

    @GetMapping("/top/purchased")
    public ResponseEntity<List<ProductDetailDTO>> getMostPurchasedProducts(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(productService.getMostPurchasedProducts(limit));
    }

    /**
     * Authenticated user'ın kendi öneri listesi. IDOR koruması:
     * userId path'ten gelmez, @CurrentUser ile auth'tan alınır.
     */
    @GetMapping("/recommendations/me")
    public ResponseEntity<List<ProductRecommendationDTO>> getMyRecommendations(@CurrentUser User user) {
        return ResponseEntity.ok(productService.getRecommendationsForUser(user.getId()));
    }

    @PostMapping("/sync-prices")
    public ResponseEntity<String> syncPrices() {
        productService.syncPricesFromCsv();
        return ResponseEntity.ok("Prices synced successfully from CSV.");
    }
}
