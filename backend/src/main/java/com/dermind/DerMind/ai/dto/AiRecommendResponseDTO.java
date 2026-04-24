package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /recommend yanıtı.
 */
@Data
@NoArgsConstructor
public class AiRecommendResponseDTO {

    @JsonProperty("user_skin_type")
    private String userSkinType;

    @JsonProperty("category_filter")
    private String categoryFilter;

    @JsonProperty("recommendations")
    private List<AiRecommendItemDTO> recommendations;
}
