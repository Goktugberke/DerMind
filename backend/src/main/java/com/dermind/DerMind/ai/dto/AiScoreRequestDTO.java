package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiScoreRequestDTO {

    @NotBlank(message = "Sephora ürün ID'si boş olamaz")
    @JsonProperty("sephora_product_id")
    private String sephoraProductId;

    @NotNull(message = "Kullanıcı profili zorunludur")
    @Valid
    @JsonProperty("user")
    private UserProfileDTO user;

    /** Aggregate recommend rate (0-1). Opsiyonel; null → AI server tarafında nötr kullanılır. */
    @JsonProperty("is_recommended")
    private Double isRecommended;
}
