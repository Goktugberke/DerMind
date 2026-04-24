package com.dermind.DerMind.product.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendResponse {
    private String user_skin_type;
    private String category_filter;
    private List<AiRecommendation> recommendations;
}
