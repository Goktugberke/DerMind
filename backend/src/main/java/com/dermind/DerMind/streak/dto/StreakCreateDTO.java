package com.dermind.DerMind.streak.dto;

import com.dermind.DerMind.common.enums.UsageFrequency;
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

    private java.util.Set<java.time.DayOfWeek> daysOfWeek;

    private java.util.List<java.time.LocalTime> customTimes;
}