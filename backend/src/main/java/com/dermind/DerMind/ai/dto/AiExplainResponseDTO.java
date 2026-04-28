package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /explain yanıtı — SHAP faktörleri + LLM açıklaması.
 */
@Data
@NoArgsConstructor
public class AiExplainResponseDTO {

    @JsonProperty("product_id")
    private String productId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("base_score")
    private Double baseScore;

    @JsonProperty("personal_score")
    private Double personalScore;

    @JsonProperty("language")
    private String language;

    @JsonProperty("shap_factors")
    private List<AiShapFactorDTO> shapFactors;

    @JsonProperty("explanation")
    private String explanation;

    @JsonProperty("cached")
    private Boolean cached;

    /** LLM çağrısı başarısız oldu mu? true → açıklama fallback metni içerebilir. */
    @JsonProperty("llm_error")
    private Boolean llmError;
}
