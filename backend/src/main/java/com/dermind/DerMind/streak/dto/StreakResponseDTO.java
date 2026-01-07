package com.dermind.DerMind.streak.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakResponseDTO {
    private Long id;
    private String userId;
    private String userName;
    private Long productId;
    private String productName;
    private String productBrand;
    private Integer currentStreak;
    private Integer longestStreak;
    private LocalDate lastUsedDate;
    private String usageFrequency;
    private String usageTime;
    private Integer totalUses;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}