package com.dermind.DerMind.product.service;

import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.dto.*;
import com.dermind.DerMind.product.mapper.ProductMapper;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final UserProductRatingRepository ratingRepository;
    private final AiServiceClient aiServiceClient;
    private final ProductMapper productMapper;

    @Transactional(readOnly = true)
    @Cacheable(value = "products-page", key = "#pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort")
    public Page<ProductResponseDTO> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable).map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public ProductDetailDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        ProductDetailDTO dto = productMapper.toDetailDTO(product);
        // Aggregates — tek SQL ile (lazy collection iteration yok, N+1 yok)
        productRepository.findProductStats(id).ifPresentOrElse(stats -> {
            dto.setAverageUserRating(stats.getAvgRating() != null ? stats.getAvgRating() : 0.0);
            dto.setTotalRatings(stats.getTotalRatings() != null ? stats.getTotalRatings().intValue() : 0);
            dto.setTotalPurchases(stats.getTotalPurchases() != null ? stats.getTotalPurchases().intValue() : 0);
        }, () -> {
            dto.setAverageUserRating(0.0);
            dto.setTotalRatings(0);
            dto.setTotalPurchases(0);
        });

        // AI personal score (auth user için)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            String email = auth.getName();
            userRepository.findByEmail(email).ifPresent(user -> {
                Double recommendRate = computeRecommendRate(product);
                Double personalScore = aiServiceClient.getPersonalScore(
                        product.getSephoraProductId(), user, recommendRate);
                if (personalScore != null) {
                    dto.setPersonalScore(personalScore);
                }
            });
        }
        if (dto.getPersonalScore() == null) {
            dto.setPersonalScore(product.getQualityScore());
        }
        return dto;
    }

    @Transactional
    @CacheEvict(value = {"products-page", "top-quality", "most-purchased"}, allEntries = true)
    public ProductResponseDTO createProduct(ProductCreateDTO dto) {
        Product product = productMapper.toEntity(dto);
        return productMapper.toResponseDTO(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(value = {"products-page", "top-quality", "most-purchased"}, allEntries = true)
    public ProductResponseDTO updateProduct(Long id, ProductUpdateDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        productMapper.updateEntity(product, dto);
        return productMapper.toResponseDTO(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(value = {"products-page", "top-quality", "most-purchased"}, allEntries = true)
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", "id", id);
        }
        productRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getProductsByBrand(String brand, Pageable pageable) {
        return productRepository.findByBrand(brand, pageable).map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> searchProductsByName(String name, Pageable pageable) {
        return productRepository.searchByName(name, pageable).map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> searchProducts(String searchTerm, Pageable pageable) {
        return productRepository.searchProducts(searchTerm, pageable).map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getProductsByMinQuality(Double minScore, Pageable pageable) {
        return productRepository.findByQualityScoreGreaterThanEqual(minScore, pageable).map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> filterProducts(String searchTerm, Double minPrice, Double maxPrice, Double minQuality, Pageable pageable) {
        return productRepository.filterProducts(searchTerm, minPrice, maxPrice, minQuality, pageable)
                .map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "top-quality", key = "#limit")
    public List<ProductDetailDTO> getTopQualityProducts(int limit) {
        return productRepository.findTopQualityProducts(Pageable.ofSize(Math.min(limit, 100)))
                .getContent().stream()
                .map(productMapper::toDetailDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "most-purchased", key = "#limit")
    public List<ProductDetailDTO> getMostPurchasedProducts(int limit) {
        return productRepository.findMostPurchasedProducts(Pageable.ofSize(Math.min(limit, 100)))
                .getContent().stream()
                .map(productMapper::toDetailDTO)
                .collect(Collectors.toList());
    }

    /**
     * Basit kural-tabanlı öneri. Tez-MVP için legacy endpoint.
     * Production tarafında /api/ai/recommend (KNN) kullanılmalı.
     */
    @Transactional(readOnly = true)
    public List<ProductRecommendationDTO> getRecommendationsForUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return productRepository.findAll().stream()
                .map(p -> analyzeProductForUser(p, user))
                .sorted((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()))
                .collect(Collectors.toList());
    }

    private static final double ALLERGEN_PENALTY = 50.0;
    private static final double QUALITY_WEIGHT = 3.0;
    private static final double QUALITY_BIAS = 15.0;

    private ProductRecommendationDTO analyzeProductForUser(Product product, User user) {
        double matchScore = 100.0;
        StringBuilder reason = new StringBuilder();
        String recommendation = "Highly Recommended";

        if (user.getAllergens() != null && !user.getAllergens().isEmpty()
                && product.getIngredients() != null) {
            String ingredientsLower = product.getIngredients().toLowerCase();
            for (String allergen : user.getAllergens().split(",")) {
                String trimmed = allergen.trim().toLowerCase();
                if (!trimmed.isEmpty() && ingredientsLower.contains(trimmed)) {
                    matchScore -= ALLERGEN_PENALTY;
                    reason.append(String.format("Warning: Contains allergen '%s'. ", trimmed));
                    recommendation = "Not Recommended";
                }
            }
        }
        if (product.getQualityScore() != null) {
            matchScore += (product.getQualityScore() * QUALITY_WEIGHT) - QUALITY_BIAS;
        }
        matchScore = Math.max(0.0, Math.min(100.0, matchScore));

        return new ProductRecommendationDTO(
                product.getId(), product.getName(), product.getBrand(),
                product.getQualityScore(), matchScore, recommendation,
                reason.toString().trim().isEmpty() ? "Highly Recommended for your skin profile." : reason.toString().trim()
        );
    }

    /**
     * Tek SQL aggregate ile recommendRate hesaplar — collection iteration yerine
     * DB-side AVG/SUM. N+1 önleme.
     */
    private Double computeRecommendRate(Product product) {
        if (product.getId() == null) return null;
        return ratingRepository.getRecommendRateByProductId(product.getId());
    }
}
