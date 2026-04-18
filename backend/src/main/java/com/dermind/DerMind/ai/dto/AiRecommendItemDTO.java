package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("similarity")
    private Double similarity;       // 0-1 arası, KNN kosinüs benzerlik skoru

    @JsonProperty("rating")
    private Double rating;           // Sephora kullanıcı puanı (1-5)

    @JsonProperty("price_usd")
    private Double priceUsd;
}
