package com.dermind.DerMind.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailDTO {
    private String id;
    private String email;
    private String name;
    private String allergens;
    private String skinType;
    private String picture;
    private int totalPurchases;
    private int totalRatings;
    private int activeStreaks;
}
