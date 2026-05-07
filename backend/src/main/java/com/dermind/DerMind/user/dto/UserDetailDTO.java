package com.dermind.DerMind.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailDTO {
    private String id;
    private String email;
    private String name;
    private List<String> allergens;
    private String skinType;
    private boolean hasAcne;
    private String picture;
    private int totalPurchases;
    private int totalRatings;
    private int activeStreaks;
    @com.fasterxml.jackson.annotation.JsonProperty("isAdmin")
    private boolean admin;
}
