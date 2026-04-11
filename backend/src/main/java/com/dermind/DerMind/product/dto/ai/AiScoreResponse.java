package com.dermind.DerMind.product.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiScoreResponse {
    private String product_id;
    private String product_name;
    private String brand;
    private Double base_score;
    private Double personal_score;
    private String skin_type;
}
