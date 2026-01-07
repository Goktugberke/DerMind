package com.dermind.DerMind.streak.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakCreateDTO {
    private String userId;
    private Long productId;
    private String usageFrequency; // DAILY, TWICE_DAILY, WEEKLY
    private String usageTime; // MORNING, EVENING, BOTH, ANYTIME
}