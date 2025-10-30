package com.dermind.DerMind.product.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO for Product with Details (including ratings)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetailDTO {
    private Long id;
    private String name;
    private String brand;
    private String ingredients;
    private Double qualityScore;
    private Double averageUserRating;
    private int totalRatings;
    private int totalPurchases;
}
