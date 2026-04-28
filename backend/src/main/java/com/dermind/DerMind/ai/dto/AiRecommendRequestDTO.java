package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /recommend isteği — app.py RecommendRequest modeli ile eşleşir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiRecommendRequestDTO {

    @NotNull(message = "Kullanıcı profili zorunludur")
    @Valid
    @JsonProperty("user")
    private UserProfileDTO user;

    @JsonProperty("category")
    private String category;            // "Skincare" | "Makeup" | "Bath & Body"

    @JsonProperty("secondary_category")
    private String secondaryCategory;   // "Sunscreen" | "Moisturizers" | ...

    @JsonProperty("top_k")
    @Builder.Default
    private int topK = 5;
}
