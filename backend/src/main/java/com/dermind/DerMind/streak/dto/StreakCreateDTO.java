package com.dermind.DerMind.streak.dto;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.common.enums.UsageTime;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakCreateDTO {

    @NotNull(message = "Product ID boş olamaz")
    private Long productId;

    @NotNull(message = "Kullanım sıklığı boş olamaz")
    private UsageFrequency usageFrequency;

    @NotNull(message = "Kullanım zamanı boş olamaz")
    private UsageTime usageTime;
}