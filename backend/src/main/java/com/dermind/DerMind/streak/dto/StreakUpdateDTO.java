package com.dermind.DerMind.streak.dto;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.common.enums.UsageTime;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakUpdateDTO {
    private UsageFrequency usageFrequency;

    private java.util.List<java.time.LocalTime> customTimes;

    private java.util.Set<java.time.DayOfWeek> daysOfWeek;

    private Boolean isActive;
}