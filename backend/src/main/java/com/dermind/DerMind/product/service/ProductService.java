package com.dermind.DerMind.product.service;

import com.dermind.DerMind.product.dto.*;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final AiServiceClient aiServiceClient;

    public Page<ProductResponseDTO> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable)
                .map(this::convertToResponseDTO);
    }

    public ProductDetailDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        
        ProductDetailDTO dto = convertToDetailDTO(product);
        
        // Get current user and fetch personalized score from AI server
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching product detail for id: {}, User context email: {}", id, userEmail);

        if (userEmail != null && !userEmail.equals("anonymousUser")) {
            userRepository.findByEmail(userEmail).ifPresent(user -> {
                log.info("Authenticated user found: {}. Requesting AI score for Sephora Product ID: {}", userEmail, product.getSephoraProductId());
                Double personalScore = aiServiceClient.getPersonalScore(product.getSephoraProductId(), user);
                if (personalScore != null) {
                    log.info("Successfully received personal score: {} for user: {}", personalScore, userEmail);
                    dto.setPersonalScore(personalScore);
                } else {
                    log.warn("AI server returned null score for product: {} and user: {}. Falling back to quality score.", id, userEmail);
                }
            });
        } else {
            log.info("Request is anonymous. Using quality score as personal score fallback.");
        }
        
        if (dto.getPersonalScore() == null) {
            dto.setPersonalScore(product.getQualityScore());
        }
        
        return dto;
    }

    @Transactional
    public ProductResponseDTO createProduct(ProductCreateDTO dto) {
        Product product = new Product();
        product.setName(dto.getName());
        product.setBrand(dto.getBrand());
        product.setIngredients(dto.getIngredients());
        product.setQualityScore(dto.getQualityScore());
        product.setBaseScore(dto.getBaseScore());
        product.setPrice(dto.getPrice());
        product.setSephoraProductId(dto.getSephoraProductId());
        product.setCategory(dto.getCategory());
        product.setSecondaryCategory(dto.getSecondaryCategory());
        product.setSephoraRating(dto.getSephoraRating());

        Product savedProduct = productRepository.save(product);
        return convertToResponseDTO(savedProduct);
    }

    @Transactional
    public ProductResponseDTO updateProduct(Long id, ProductUpdateDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getBrand() != null) product.setBrand(dto.getBrand());
        if (dto.getIngredients() != null) product.setIngredients(dto.getIngredients());
        if (dto.getQualityScore() != null) product.setQualityScore(dto.getQualityScore());
        if (dto.getBaseScore() != null) product.setBaseScore(dto.getBaseScore());
        if (dto.getPrice() != null) product.setPrice(dto.getPrice());
        if (dto.getSephoraProductId() != null) product.setSephoraProductId(dto.getSephoraProductId());
        if (dto.getCategory() != null) product.setCategory(dto.getCategory());
        if (dto.getSecondaryCategory() != null) product.setSecondaryCategory(dto.getSecondaryCategory());
        if (dto.getSephoraRating() != null) product.setSephoraRating(dto.getSephoraRating());

        Product updatedProduct = productRepository.save(product);
        return convertToResponseDTO(updatedProduct);
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }

    public Page<ProductResponseDTO> getProductsByBrand(String brand, Pageable pageable) {
        return productRepository.findByBrand(brand, pageable)
                .map(this::convertToResponseDTO);
    }

    public Page<ProductResponseDTO> searchProductsByName(String name, Pageable pageable) {
        return productRepository.searchByName(name, pageable)
                .map(this::convertToResponseDTO);
    }

    public Page<ProductResponseDTO> searchProducts(String searchTerm, Pageable pageable) {
        return productRepository.searchProducts(searchTerm, pageable)
                .map(this::convertToResponseDTO);
    }

    public Page<ProductResponseDTO> getProductsByMinQuality(Double minScore, Pageable pageable) {
        return productRepository.findByQualityScoreGreaterThanEqual(minScore, pageable)
                .map(this::convertToResponseDTO);
    }

    public List<ProductDetailDTO> getTopQualityProducts(int limit) {
        return productRepository.findTopQualityProducts(Pageable.ofSize(limit))
                .getContent().stream().map(this::convertToDetailDTO).collect(Collectors.toList());
    }

    public List<ProductDetailDTO> getMostPurchasedProducts(int limit) {
        return productRepository.findMostPurchasedProducts(Pageable.ofSize(limit))
                .getContent().stream().map(this::convertToDetailDTO).collect(Collectors.toList());
    }

    public List<ProductRecommendationDTO> getRecommendationsForUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        List<Product> allProducts = productRepository.findAll();
        List<ProductRecommendationDTO> recommendations = new ArrayList<>();

        for (Product product : allProducts) {
            ProductRecommendationDTO recommendation = analyzeProductForUser(product, user);
            recommendations.add(recommendation);
        }

        return recommendations.stream()
                .sorted((r1, r2) -> Double.compare(r2.getMatchScore(), r1.getMatchScore()))
                .collect(Collectors.toList());
    }

    private ProductRecommendationDTO analyzeProductForUser(Product product, User user) {
        double matchScore = 100.0;
        StringBuilder reason = new StringBuilder();
        String recommendation = "Highly Recommended";

        if (user.getAllergens() != null && !user.getAllergens().isEmpty()) {
            String[] allergens = user.getAllergens().split(",");
            for (String allergen : allergens) {
                if (product.getIngredients() != null && product.getIngredients().toLowerCase().contains(allergen.trim().toLowerCase())) {
                    matchScore -= 50.0;
                    reason.append(String.format("Warning: Contains allergen '%s'. ", allergen.trim()));
                    recommendation = "Not Recommended";
                }
            }
        }

        if (product.getQualityScore() != null) {
            matchScore += (product.getQualityScore() * 3) - 15.0;
        }

        if (matchScore > 100) matchScore = 100.0;
        if (matchScore < 0) matchScore = 0.0;

        return new ProductRecommendationDTO(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getQualityScore(),
                matchScore,
                recommendation,
                reason.toString().trim().isEmpty() ? "Highly Recommended for your skin profile." : reason.toString().trim()
        );
    }

    private ProductResponseDTO convertToResponseDTO(Product product) {
        return new ProductResponseDTO(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getIngredients(),
                product.getQualityScore(),
                product.getBaseScore(),
                product.getPrice(),
                product.getSephoraProductId(),
                product.getCategory(),
                product.getSecondaryCategory(),
                product.getSephoraRating(),
                null // personalScore
        );
    }

    private ProductDetailDTO convertToDetailDTO(Product product) {
        double avgRating = 0.0;
        if (product.getRatings() != null && !product.getRatings().isEmpty()) {
            avgRating = product.getRatings().stream()
                    .filter(r -> r.getRating() != null)
                    .mapToDouble(r -> r.getRating().doubleValue())
                    .average()
                    .orElse(0.0);
        }

        return new ProductDetailDTO(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getIngredients(),
                product.getQualityScore(),
                avgRating,
                product.getRatings() != null ? product.getRatings().size() : 0,
                product.getPurchases() != null ? product.getPurchases().size() : 0,
                null // personalScore
        );
    }
}