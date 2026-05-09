package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /score yanıtı — app.py /score endpoint dönüş değeri.
 */
@Data
@NoArgsConstructor
public class AiScoreResponseDTO {

    @JsonProperty("product_id")
    private String productId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("brand")
    private String brand;

    @JsonProperty("base_score")
    private Double baseScore;

    @JsonProperty("personal_score")
    private Double personalScore;

    @JsonProperty("skin_type")
    private String skinType;

    /** Kullanıcının alerjenlerine uyan içerik uyarıları. Boş liste = güvenli. */
    @JsonProperty("allergen_warnings")
    private List<String> allergenWarnings;

    @JsonProperty("price_usd")
    private Double priceUsd;

    @JsonProperty("rating")
    private Double rating;
}
