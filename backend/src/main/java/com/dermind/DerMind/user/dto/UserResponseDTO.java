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
public class UserResponseDTO {
    private String id;
    private String email;
    private String name;
    private List<String> allergens;
    private String skinType;
    private boolean hasAcne;
    private String picture;
    @com.fasterxml.jackson.annotation.JsonProperty("isAdmin")
    private boolean admin;
}
