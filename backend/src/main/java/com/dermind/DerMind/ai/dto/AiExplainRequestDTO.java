package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /explain isteği — app.py ExplainRequest modeli ile eşleşir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiExplainRequestDTO {

    @JsonProperty("sephora_product_id")
    private String sephoraProductId;

    @JsonProperty("user")
    private UserProfileDTO user;

    @JsonProperty("language")
    @Builder.Default
    private String language = "tr";   // "tr" | "en"
}
