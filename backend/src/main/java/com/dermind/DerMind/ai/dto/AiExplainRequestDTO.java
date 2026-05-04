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
 * POST /explain isteği — app.py ExplainRequest modeli ile eşleşir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiExplainRequestDTO {

    @NotBlank(message = "Sephora ürün ID'si boş olamaz")
    @JsonProperty("sephora_product_id")
    private String sephoraProductId;

    @NotNull(message = "Kullanıcı profili zorunludur")
    @Valid
    @JsonProperty("user")
    private UserProfileDTO user;

    @JsonProperty("language")
    @Builder.Default
    private String language = "tr";   // "tr" | "en"

    /** Aggregate recommend rate (0-1). Opsiyonel; null → AI nötr skoru kullanır. */
    @JsonProperty("is_recommended")
    private Double isRecommended;
}
