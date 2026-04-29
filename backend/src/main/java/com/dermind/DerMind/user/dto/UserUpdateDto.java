package com.dermind.DerMind.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateDto {
    private String name;
    private List<String> allergens;
    private String skinType;
    private Boolean hasAcne;
    private String picture;
}
