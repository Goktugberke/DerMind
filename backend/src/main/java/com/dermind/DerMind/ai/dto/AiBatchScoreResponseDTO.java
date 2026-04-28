package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /score/batch yanıtı — results + errors listesi.
 */
@Data
@NoArgsConstructor
public class AiBatchScoreResponseDTO {

    @JsonProperty("results")
    private List<AiScoreResponseDTO> results;

    @JsonProperty("errors")
    private List<BatchError> errors;

    @Data
    @NoArgsConstructor
    public static class BatchError {
        @JsonProperty("product_id")
        private String productId;

        @JsonProperty("error")
        private String error;
    }
}
