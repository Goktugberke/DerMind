package com.dermind.DerMind.admin.controller;

import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.mapper.ProductMapper;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user_product_rating.dto.RatingResponseDTO;
import com.dermind.DerMind.user_product_rating.mapper.RatingMapper;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ProductRepository productRepository;
    private final UserProductRatingRepository ratingRepository;
    private final ProductMapper productMapper;
    private final RatingMapper ratingMapper;
    private final CacheManager cacheManager;
    private final EntityManager entityManager;

    private void clearProductCaches() {
        if (cacheManager != null) {
            cacheManager.getCacheNames().forEach(name -> {
                var cache = cacheManager.getCache(name);
                if (cache != null) cache.clear();
            });
        }
    }

    @PreAuthorize("@authz.isAdmin()")
    @GetMapping("/products")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductResponseDTO>> getAllProductsAdmin() {
        List<ProductResponseDTO> products = productRepository.findAll().stream()
                .map(p -> {
                    ProductResponseDTO dto = productMapper.toResponseDTO(p);
                    dto.setHiddenStatus(p.isHidden());
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(products);
    }

    @PreAuthorize("@authz.isAdmin()")
    @DeleteMapping("/products/{productId}")
    @Transactional
    public ResponseEntity<Void> deleteProduct(@PathVariable Long productId) {
        if (!productRepository.existsById(productId)) {
            return ResponseEntity.notFound().build();
        }
        productRepository.deleteById(productId);
        clearProductCaches();
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("@authz.isAdmin()")
    @PutMapping("/products/{productId}/hide")
    @Transactional
    public ResponseEntity<ProductResponseDTO> toggleHideProduct(@PathVariable Long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        boolean newStatus = !product.isHidden();
        product.setHidden(newStatus);
        productRepository.save(product);
        entityManager.flush();

        clearProductCaches();

        ProductResponseDTO response = productMapper.toResponseDTO(product);
        response.setHiddenStatus(newStatus);

        System.out.println("Product " + productId + " toggle: hidden=" + newStatus);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("@authz.isAdmin()")
    @GetMapping("/reviews")
    @Transactional(readOnly = true)
    public ResponseEntity<List<RatingResponseDTO>> getAllReviewsAdmin() {
        List<RatingResponseDTO> reviews = ratingRepository.findAllWithUserAndProduct().stream()
                .map(ratingMapper::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(reviews);
    }

    @PreAuthorize("@authz.isAdmin()")
    @DeleteMapping("/reviews/{reviewId}")
    @Transactional
    public ResponseEntity<Void> deleteReview(@PathVariable Long reviewId) {
        if (!ratingRepository.existsById(reviewId)) {
            return ResponseEntity.notFound().build();
        }
        ratingRepository.deleteById(reviewId);
        return ResponseEntity.noContent().build();
    }
}
