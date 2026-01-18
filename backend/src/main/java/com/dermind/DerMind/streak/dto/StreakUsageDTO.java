package com.dermind.DerMind.streak.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakUsageDTO {
    private Long streakId;
    private Boolean used; // Kullanıcı kullandı mı?
}