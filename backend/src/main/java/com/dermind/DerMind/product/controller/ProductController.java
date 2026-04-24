package com.dermind.DerMind.product.controller;

import com.dermind.DerMind.product.dto.*;
import com.dermind.DerMind.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService productService;

    /**
     * Get all products
     * GET /api/products
     */
    @GetMapping
    public ResponseEntity<Page<ProductResponseDTO>> getAllProducts(Pageable pageable) {
        Page<ProductResponseDTO> products = productService.getAllProducts(pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Get product by ID
     * GET /api/products/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailDTO> getProductById(@PathVariable Long id) {
        try {
            ProductDetailDTO product = productService.getProductById(id);
            return ResponseEntity.ok(product);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get similar products
     * GET /api/products/{id}/similar
     */
    @GetMapping("/{id}/similar")
    public ResponseEntity<List<ProductResponseDTO>> getSimilarProducts(@PathVariable Long id) {
        try {
            List<ProductResponseDTO> similarProducts = productService.getSimilarProducts(id);
            return ResponseEntity.ok(similarProducts);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create new product
     * POST /api/products
     */
    @PostMapping
    public ResponseEntity<?> createProduct(@Valid @RequestBody ProductCreateDTO dto) {
        try {
            ProductResponseDTO createdProduct = productService.createProduct(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update product
     * PUT /api/products/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateDTO dto) {
        try {
            ProductResponseDTO updatedProduct = productService.updateProduct(id, dto);
            return ResponseEntity.ok(updatedProduct);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete product
     * DELETE /api/products/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        try {
            productService.deleteProduct(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get products by brand
     * GET /api/products/brand/{brand}
     */
    @GetMapping("/brand/{brand}")
    public ResponseEntity<Page<ProductResponseDTO>> getProductsByBrand(@PathVariable String brand, Pageable pageable) {
        Page<ProductResponseDTO> products = productService.getProductsByBrand(brand, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Search products by name
     * GET /api/products/search/name?name={name}
     */
    @GetMapping("/search/name")
    public ResponseEntity<Page<ProductResponseDTO>> searchProductsByName(@RequestParam String name, Pageable pageable) {
        Page<ProductResponseDTO> products = productService.searchProductsByName(name, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Search products (name or brand)
     * GET /api/products/search?q={searchTerm}
     */
    @GetMapping("/search")
    public ResponseEntity<Page<ProductResponseDTO>> searchProducts(@RequestParam String query, Pageable pageable) {
        Page<ProductResponseDTO> products = productService.searchProducts(query, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Filter products with multiple criteria
     * GET /api/products/filter?query={q}&minPrice={min}&maxPrice={max}&minQuality={quality}
     */
    @GetMapping("/filter")
    public ResponseEntity<Page<ProductResponseDTO>> filterProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Double minQuality,
            Pageable pageable) {
        Page<ProductResponseDTO> products = productService.filterProducts(query, minPrice, maxPrice, minQuality, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Get products by minimum quality score
     * GET /api/products/quality?min={minScore}
     */
    @GetMapping("/quality")
    public ResponseEntity<Page<ProductResponseDTO>> getProductsByMinQuality(
            @RequestParam(defaultValue = "0.0") Double min, Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByMinQuality(min, pageable));
    }

    /**
     * Get top quality products
     * GET /api/products/top/quality?limit={limit}
     */
    @GetMapping("/top/quality")
    public ResponseEntity<List<ProductDetailDTO>> getTopQualityProducts(
            @RequestParam(defaultValue = "10") int limit) {
        List<ProductDetailDTO> products = productService.getTopQualityProducts(limit);
        return ResponseEntity.ok(products);
    }

    /**
     * Get most purchased products
     * GET /api/products/top/purchased?limit={limit}
     */
    @GetMapping("/top/purchased")
    public ResponseEntity<List<ProductDetailDTO>> getMostPurchasedProducts(
            @RequestParam(defaultValue = "10") int limit) {
        List<ProductDetailDTO> products = productService.getMostPurchasedProducts(limit);
        return ResponseEntity.ok(products);
    }

    /**
     * Get personalized product recommendations for a user
     * GET /api/products/recommendations/{userId}
     */
    @GetMapping("/recommendations/{userId}")
    public ResponseEntity<?> getRecommendationsForUser(@PathVariable String userId) {
        try {
            List<ProductRecommendationDTO> recommendations =
                    productService.getRecommendationsForUser(userId);
            return ResponseEntity.ok(recommendations);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
