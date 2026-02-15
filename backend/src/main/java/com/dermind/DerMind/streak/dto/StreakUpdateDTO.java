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

    private Boolean isActive;
}