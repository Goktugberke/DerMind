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
public class AiUserProfile {
    private String skin_type;
    private boolean has_acne;
    private List<String> allergies;
}
