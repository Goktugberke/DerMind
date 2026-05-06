package com.dermind.DerMind.product.service;

import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.dto.*;
import com.dermind.DerMind.product.mapper.ProductMapper;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import com.dermind.DerMind.ai.dto.AiScoreResponseDTO;
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
                AiScoreResponseDTO aiResponse = aiServiceClient.getAiScoreResponse(
                        product.getSephoraProductId(), user, recommendRate);
                if (aiResponse != null) {
                    Double personalScore = aiResponse.getPersonalScore();
                    log.info("[ProductService] Fetched personalScore {} for product {} and user {}", personalScore, product.getSephoraProductId(), email);
                    dto.setPersonalScore(personalScore);
                    
                    // REAL PRICE ENRICHMENT: If DB price is missing, use AI server price
                    if (dto.getPrice() == null || dto.getPrice() == 0.0) {
                        dto.setPrice(aiResponse.getPriceUsd());
                    }
                } else {
                    log.warn("[ProductService] AI response returned null for product {} and user {}", product.getSephoraProductId(), email);
                }
            });
        }
        if (dto.getPersonalScore() == null) {
            log.info("[ProductService] Using qualityScore fallback for product {}", product.getId());
            dto.setPersonalScore(product.getQualityScore());
        }
        return dto;
    }

    @Transactional
    @CacheEvict(value = { "products-page", "top-quality", "most-purchased" }, allEntries = true)
    public ProductResponseDTO createProduct(ProductCreateDTO dto) {
        Product product = productMapper.toEntity(dto);
        return productMapper.toResponseDTO(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(value = { "products-page", "top-quality", "most-purchased" }, allEntries = true)
    public ProductResponseDTO updateProduct(Long id, ProductUpdateDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        productMapper.updateEntity(product, dto);
        return productMapper.toResponseDTO(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(value = { "products-page", "top-quality", "most-purchased" }, allEntries = true)
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
        return productRepository.findByQualityScoreGreaterThanEqual(minScore, pageable)
                .map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> filterProducts(String searchTerm, Double minPrice, Double maxPrice,
            Double minQuality, Pageable pageable) {
        Page<Product> products = productRepository.filterProducts(searchTerm, minPrice, maxPrice, minQuality, pageable);
        log.info("[ProductService] Filter results: {} products found for term='{}', minPrice={}, maxPrice={}, minQuality={}", 
                 products.getTotalElements(), searchTerm, minPrice, maxPrice, minQuality);
        return products.map(productMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public List<ProductDetailDTO> getTopQualityProducts(int limit) {
        return productRepository.findTopQualityProducts(Pageable.ofSize(Math.min(limit, 100)))
                .getContent().stream()
                .map(productMapper::toDetailDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDetailDTO> getMostPurchasedProducts(int limit) {
        return productRepository.findMostPurchasedProducts(Pageable.ofSize(Math.min(limit, 100)))
                .getContent().stream()
                .map(productMapper::toDetailDTO)
                .collect(Collectors.toList());
    }

    /**
     * Basit kural-tabanlı öneri — kural tabanlı MVP, /api/ai/recommend (KNN) tercih
     * edilmeli.
     * findAll() yerine top-quality sayfası üzerinde çalışır (maks 200 ürün, OOM
     * önleme).
     */
    @Transactional(readOnly = true)
    public List<ProductRecommendationDTO> getRecommendationsForUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return productRepository.findTopQualityProducts(Pageable.ofSize(200))
                .getContent().stream()
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
            for (String allergen : user.getAllergens()) {
                if (ingredientsLower.contains(allergen)) {
                    matchScore -= ALLERGEN_PENALTY;
                    reason.append(String.format("Warning: Contains allergen '%s'. ", allergen));
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
                reason.toString().trim().isEmpty() ? "Highly Recommended for your skin profile."
                        : reason.toString().trim());
    }

    /**
     * Tek SQL aggregate ile recommendRate hesaplar — collection iteration yerine
     * DB-side AVG/SUM. N+1 önleme.
     */
    private Double computeRecommendRate(Product product) {
        if (product.getId() == null)
            return null;
        return ratingRepository.getRecommendRateByProductId(product.getId());
    }

    @Transactional
    public void syncPricesFromCsv() {
        // Path should be relative to project root or use absolute
        String infoPath = "ai-server/datasets/sephora_dataset/product_info.csv";
        java.io.File file = new java.io.File(infoPath);
        if (!file.exists()) {
            log.error("CSV file not found at: {}", infoPath);
            return;
        }

        try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.FileReader(file))) {
            String line;
            String headerLine = br.readLine();
            if (headerLine == null) return;
            
            String[] headers = headerLine.split(",");
            int pidIdx = -1, priceIdx = -1, ratingIdx = -1;
            
            for (int i = 0; i < headers.length; i++) {
                if (headers[i].equals("product_id")) pidIdx = i;
                if (headers[i].equals("price_usd")) priceIdx = i;
                if (headers[i].equals("rating")) ratingIdx = i;
            }

            if (pidIdx == -1 || priceIdx == -1) {
                log.error("Required columns missing in CSV");
                return;
            }

            int count = 0;
            while ((line = br.readLine()) != null) {
                // Robust CSV split: ignore commas inside quotes
                String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (values.length > Math.max(pidIdx, priceIdx)) {
                    String pid = values[pidIdx].replace("\"", "");
                    String priceStr = values[priceIdx].replace("\"", "");
                    
                    try {
                        Double price = (priceStr == null || priceStr.isEmpty() || priceStr.equals("null")) ? null : Double.parseDouble(priceStr);
                        
                        productRepository.findBySephoraProductId(pid).ifPresent(p -> {
                            if (price != null) p.setPrice(price);
                            productRepository.save(p);
                        });
                        count++;
                    } catch (NumberFormatException e) {
                        // Skip header or bad lines
                    }
                }
            }
            log.info("Successfully synced {} prices from CSV", count);
        } catch (java.io.IOException e) {
            log.error("Error reading CSV for price sync: {}", e.getMessage());
        }
    }
}
