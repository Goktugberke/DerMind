package com.dermind.DerMind.user_product_rating.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRatingStatsDTO {
    private Long productId;
    private String productName;
    private Long totalRatings;
    private Double averageRating;
    private Double averagePersonalizedRating;
    private Long recommendCount;
    private Long skinImprovementCount;
    private Long verifiedPurchaseCount;
}