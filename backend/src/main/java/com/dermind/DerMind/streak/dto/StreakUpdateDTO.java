package com.dermind.DerMind.streak.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakUpdateDTO {
    private String usageFrequency;
    private String usageTime;
    private Boolean isActive;
}