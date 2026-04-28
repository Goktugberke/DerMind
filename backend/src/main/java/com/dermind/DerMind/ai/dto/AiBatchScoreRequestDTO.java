package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /score/batch isteği — maks 50 ürün tek çağrıda puanlanır.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiBatchScoreRequestDTO {

    @NotEmpty(message = "En az bir ürün ID'si gerekli")
    @Size(max = 50, message = "Tek seferinde en fazla 50 ürün puanlanabilir")
    @JsonProperty("sephora_product_ids")
    private List<String> sephoraProductIds;

    @NotNull(message = "Kullanıcı profili zorunludur")
    @Valid
    @JsonProperty("user")
    private UserProfileDTO user;

    @JsonProperty("is_recommended")
    private Double isRecommended;
}
