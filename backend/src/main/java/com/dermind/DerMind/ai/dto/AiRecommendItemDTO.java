package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * /recommend yanıtındaki tek bir ürün önerisi.
 */
@Data
@NoArgsConstructor
public class AiRecommendItemDTO {

    @JsonProperty("product_id")
    private String productId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("brand")
    private String brand;

    @JsonProperty("category")
    private String category;

    @JsonProperty("base_score")
    private Double baseScore;

    @DecimalMin(value = "0.0", message = "Benzerlik skoru 0 ile 1 arasında olmalıdır")
    @DecimalMax(value = "1.0", message = "Benzerlik skoru 0 ile 1 arasında olmalıdır")
    @JsonProperty("similarity")
    private Double similarity;

    @JsonProperty("rating")
    private Double rating;

    @JsonProperty("price_usd")
    private Double priceUsd;
}
