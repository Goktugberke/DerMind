package com.dermind.DerMind.product.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO for Product Recommendation Response
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRecommendationDTO {
    private Long id;
    private String name;
    private String brand;
    private Double qualityScore;
    private Double matchScore; // Kullanıcıya uygunluk puanı
    private String recommendation; // "Highly Recommended", "Suitable", "Not Recommended"
    private String reason; // Öneri nedeni açıklaması
    private Double price;
    private String imageUrl;
}
