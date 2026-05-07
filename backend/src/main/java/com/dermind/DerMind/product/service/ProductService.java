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
    private final IngredientSafetyChecker ingredientSafetyChecker;

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getAllProducts(Pageable pageable) {
        Page<ProductResponseDTO> page = productRepository.filterProducts(null, null, null, null, pageable)
                .map(productMapper::toResponseDTO);
        return populatePersonalScores(page);
    }

    private Page<ProductResponseDTO> populatePersonalScores(Page<ProductResponseDTO> page) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            String email = auth.getName();
            userRepository.findByEmail(email).ifPresent(user -> {
                List<String> sephoraIds = page.getContent().stream()
                        .map(ProductResponseDTO::getSephoraProductId)
                        .filter(id -> id != null && !id.isBlank())
                        .collect(Collectors.toList());

                if (!sephoraIds.isEmpty()) {
                    java.util.Map<String, Double> scores = aiServiceClient.getBatchScores(sephoraIds, user);
                    for (ProductResponseDTO dto : page.getContent()) {
                        if (dto.getSephoraProductId() != null && scores.containsKey(dto.getSephoraProductId())) {
                            dto.setPersonalScore(scores.get(dto.getSephoraProductId()));
                        } else {
                            dto.setPersonalScore(dto.getQualityScore());
                        }
                    }
                }
            });
        } else {
            // Unauthenticated: personal score = quality score
            for (ProductResponseDTO dto : page.getContent()) {
                dto.setPersonalScore(dto.getQualityScore());
            }
        }
        return page;
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

        IngredientSafetyChecker.IngredientCounts counts = ingredientSafetyChecker.analyze(product.getIngredients());
        dto.setSafeIngredientCount(counts.safeCount());
        dto.setCautionIngredientCount(counts.cautionCount());
        dto.setRiskyIngredientCount(counts.riskyCount());

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
        Page<ProductResponseDTO> page = productRepository.findByBrandAndHiddenFalse(brand, pageable).map(productMapper::toResponseDTO);
        return populatePersonalScores(page);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> searchProductsByName(String name, Pageable pageable) {
        Page<ProductResponseDTO> page = productRepository.searchByName(name, pageable).map(productMapper::toResponseDTO);
        return populatePersonalScores(page);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> searchProducts(String searchTerm, Pageable pageable) {
        Page<ProductResponseDTO> page = productRepository.searchProducts(searchTerm, pageable).map(productMapper::toResponseDTO);
        return populatePersonalScores(page);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getProductsByMinQuality(Double minScore, Pageable pageable) {
        Page<ProductResponseDTO> page = productRepository.findByQualityScoreGreaterThanEqualAndHiddenFalse(minScore, pageable)
                .map(productMapper::toResponseDTO);
        return populatePersonalScores(page);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> filterProducts(String searchTerm, Double minPrice, Double maxPrice,
            Double minQuality, Pageable pageable) {
        Page<ProductResponseDTO> page = productRepository.filterProducts(searchTerm, minPrice, maxPrice, minQuality, pageable)
                .map(productMapper::toResponseDTO);
        return populatePersonalScores(page);
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
                        : reason.toString().trim(),
                product.getPrice(), null);
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
                String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (values.length > Math.max(pidIdx, priceIdx)) {
                    String pid = values[pidIdx].replace("\"", "");
                    String priceStr = values[priceIdx].replace("\"", "");
                    String ratingStr = (ratingIdx != -1 && values.length > ratingIdx) ? values[ratingIdx].replace("\"", "") : null;
                    
                    try {
                        Double price = (priceStr == null || priceStr.isEmpty() || priceStr.equals("null")) ? null : Double.parseDouble(priceStr);
                        Double rawRating = (ratingStr == null || ratingStr.isEmpty() || ratingStr.equals("null")) ? null : Double.parseDouble(ratingStr);
                        Double scaledRating = (rawRating != null) ? rawRating * 2.0 : null;
                        
                        productRepository.findBySephoraProductId(pid).ifPresent(p -> {
                            boolean changed = false;
                            if (price != null) { p.setPrice(price); changed = true; }
                            if (scaledRating != null) { p.setQualityScore(scaledRating); changed = true; }
                            if (changed) productRepository.save(p);
                        });
                        count++;
                        if (count % 100 == 0) {
                            productRepository.flush();
                        }
                    } catch (NumberFormatException e) {
                        // Skip
                    }
                }
            }
            log.info("Successfully synced {} prices from CSV", count);
        } catch (java.io.IOException e) {
            log.error("Error reading CSV for price sync: {}", e.getMessage());
        }
    }
}
