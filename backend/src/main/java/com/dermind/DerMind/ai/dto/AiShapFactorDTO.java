package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * /explain yanıtındaki tek bir SHAP faktörü.
 */
@Data
@NoArgsConstructor
public class AiShapFactorDTO {

    @JsonProperty("feature")
    private String feature;         // Özellik adı (örn. "good_for_dry")

    @JsonProperty("effect")
    private Double effect;          // SHAP değeri (+ artıran, - düşüren)

    @JsonProperty("direction")
    private String direction;       // "ARTIRAN" | "DUSUREN"
}
