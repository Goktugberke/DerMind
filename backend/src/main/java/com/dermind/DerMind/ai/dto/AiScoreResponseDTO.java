package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
