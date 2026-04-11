package com.dermind.DerMind.product.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiScoreRequest {
    private String sephora_product_id;
    private AiUserProfile user;
}
