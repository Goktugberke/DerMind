package com.dermind.DerMind.product.service;

import com.dermind.DerMind.product.dto.*;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    // Tüm ürünleri getir
    public List<ProductResponseDTO> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // ID ile ürün getir
    public ProductDetailDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        return convertToDetailDTO(product);
    }

    // Yeni ürün oluştur
    @Transactional
    public ProductResponseDTO createProduct(ProductCreateDTO dto) {
        Product product = new Product();
        product.setName(dto.getName());
        product.setBrand(dto.getBrand());
        product.setIngredients(dto.getIngredients());
        product.setQualityScore(dto.getQualityScore());

        Product savedProduct = productRepository.save(product);
        return convertToResponseDTO(savedProduct);
    }

    // Ürünü güncelle
    @Transactional
    public ProductResponseDTO updateProduct(Long id, ProductUpdateDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if (dto.getName() != null)
            product.setName(dto.getName());
        if (dto.getBrand() != null)
            product.setBrand(dto.getBrand());
        if (dto.getIngredients() != null)
            product.setIngredients(dto.getIngredients());
        if (dto.getQualityScore() != null)
            product.setQualityScore(dto.getQualityScore());

        Product updatedProduct = productRepository.save(product);
        return convertToResponseDTO(updatedProduct);
    }

    // Ürünü sil
    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }

    // Marka adına göre ürünleri getir
    public List<ProductResponseDTO> getProductsByBrand(String brand) {
        return productRepository.findByBrand(brand)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // Ürün adına göre arama
    public List<ProductResponseDTO> searchProductsByName(String name) {
        return productRepository.searchByName(name)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // Genel arama (isim veya marka)
    public List<ProductResponseDTO> searchProducts(String searchTerm) {
        return productRepository.searchProducts(searchTerm)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // Kalite puanına göre filtreleme
    public List<ProductResponseDTO> getProductsByMinQuality(Double minScore) {
        return productRepository.findByQualityScoreGreaterThanEqual(minScore)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // En yüksek kaliteli ürünler
    public List<ProductDetailDTO> getTopQualityProducts(int limit) {
        return productRepository.findTopQualityProducts()
                .stream()
                .limit(limit)
                .map(this::convertToDetailDTO)
                .collect(Collectors.toList());
    }

    // En çok satın alınan ürünler
    public List<ProductDetailDTO> getMostPurchasedProducts(int limit) {
        return productRepository.findMostPurchasedProducts()
                .stream()
                .limit(limit)
                .map(this::convertToDetailDTO)
                .collect(Collectors.toList());
    }

    // Kullanıcıya özel ürün önerileri
    public List<ProductRecommendationDTO> getRecommendationsForUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        List<Product> allProducts = productRepository.findAll();
        List<ProductRecommendationDTO> recommendations = new ArrayList<>();

        for (Product product : allProducts) {
            ProductRecommendationDTO recommendation = analyzeProductForUser(product, user);
            recommendations.add(recommendation);
        }

        // Uygunluk puanına göre sırala
        return recommendations.stream()
                .sorted((r1, r2) -> Double.compare(r2.getMatchScore(), r1.getMatchScore()))
                .collect(Collectors.toList());
    }

    // Kullanıcı için ürün analizi (basit versiyon)
    private ProductRecommendationDTO analyzeProductForUser(Product product, User user) {
        double matchScore = 100.0;
        StringBuilder reason = new StringBuilder();
        String recommendation = "Highly Recommended";

        // Alerjen kontrolü
        if (user.getAllergens() != null && !user.getAllergens().isEmpty()) {
            String[] allergens = user.getAllergens().split(",");
            for (String allergen : allergens) {
                String trimmedAllergen = allergen.trim().toLowerCase();
                if (product.getIngredients() != null &&
                        product.getIngredients().toLowerCase().contains(trimmedAllergen)) {
                    matchScore -= 50.0;
                    reason.append(String.format("Warning: Contains allergen '%s'. ", allergen.trim()));
                    recommendation = "Not Recommended";
                }
            }
        }

        // Kalite puanı etkisi
        if (product.getQualityScore() != null) {
            double qualityFactor = (product.getQualityScore() / 10.0) * 30.0;
            matchScore += qualityFactor - 15.0; // Normalize edilmiş etki

            if (product.getQualityScore() >= 8.0) {
                reason.append("High quality ingredients. ");
            } else if (product.getQualityScore() < 5.0) {
                reason.append("Lower quality ingredients detected. ");
                if (recommendation.equals("Highly Recommended")) {
                    recommendation = "Suitable";
                }
            }
        }

        // Cilt tipi kontrolü (basit versiyon - geliştirilmeli)
        if (user.getSkinType() != null && product.getIngredients() != null) {
            String skinType = user.getSkinType().toLowerCase();
            String ingredients = product.getIngredients().toLowerCase();

            if (skinType.contains("dry") && ingredients.contains("alcohol")) {
                matchScore -= 20.0;
                reason.append("May not be suitable for dry skin due to alcohol content. ");
                if (recommendation.equals("Highly Recommended")) {
                    recommendation = "Suitable";
                }
            } else if (skinType.contains("oily") && ingredients.contains("oil")) {
                matchScore -= 10.0;
                reason.append("Contains oils - use with caution on oily skin. ");
            } else if (skinType.contains("sensitive") &&
                    (ingredients.contains("fragrance") || ingredients.contains("perfume"))) {
                matchScore -= 15.0;
                reason.append("Contains fragrance - may irritate sensitive skin. ");
            }
        }

        // Sınır kontrolü
        if (matchScore > 100)
            matchScore = 100.0;
        if (matchScore < 0)
            matchScore = 0.0;

        // Öneri seviyesini puana göre ayarla
        if (matchScore < 40 && !recommendation.equals("Not Recommended")) {
            recommendation = "Not Recommended";
        } else if (matchScore < 70 && recommendation.equals("Highly Recommended")) {
            recommendation = "Suitable";
        }

        if (reason.length() == 0) {
            reason.append("This product is suitable for your skin profile.");
        }

        return new ProductRecommendationDTO(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getQualityScore(),
                matchScore,
                recommendation,
                reason.toString().trim());
    }

    // DTO Dönüşüm metodları
    private ProductResponseDTO convertToResponseDTO(Product product) {
        return new ProductResponseDTO(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getIngredients(),
                product.getQualityScore());
    }

    private ProductDetailDTO convertToDetailDTO(Product product) {
        double avgRating = 0.0;

        // ⭐ DÜZELTİLDİ - rating (Integer) alanını kullanıyor
        if (product.getRatings() != null && !product.getRatings().isEmpty()) {
            avgRating = product.getRatings().stream()
                    .filter(r -> r.getRating() != null) // null kontrolü
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
                product.getPurchases() != null ? product.getPurchases().size() : 0);
    }
}