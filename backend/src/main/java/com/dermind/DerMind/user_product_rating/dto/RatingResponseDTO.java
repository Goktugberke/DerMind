package com.dermind.DerMind.user_product_rating.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingResponseDTO {
    private Long id;
    private String userId;
    private String userName;
    private Long productId;
    private String productName;
    private String productBrand;
    private Integer rating;
    private Double personalizedRating;
    private String review;
    private Boolean skinImprovement;
    private Boolean wouldRecommend;
    private Integer usageDuration;
    private String usageDurationUnit;
    private String pros;
    private String cons;
    private Boolean verifiedPurchase;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}