package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /score isteği — app.py ScoreRequest modeli ile eşleşir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiScoreRequestDTO {

    @JsonProperty("sephora_product_id")
    private String sephoraProductId;

    @JsonProperty("user")
    private UserProfileDTO user;
}
