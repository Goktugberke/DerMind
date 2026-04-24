package com.dermind.DerMind.product.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendation {
    private String product_id;
    private String product_name;
    private String brand;
    private String category;
    private Double base_score;
    private Double similarity;
    private Double rating;
    private Double price_usd;
}
