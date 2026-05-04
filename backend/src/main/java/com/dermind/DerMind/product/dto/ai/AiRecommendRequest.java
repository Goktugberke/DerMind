package com.dermind.DerMind.product.dto.ai;

import com.dermind.DerMind.ai.dto.UserProfileDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendRequest {
    private UserProfileDTO user;
    private String category;
    private String secondary_category;
    private int top_k;
}
