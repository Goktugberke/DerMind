package com.dermind.DerMind.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateDto {
    private String name;
    private String allergens;
    private String skinType;
    private Boolean hasAcne;   // Boolean (büyük B) — null ise güncelleme yapma
    private String picture;
}
