package com.dermind.DerMind.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserCreateDto {
    @NotBlank(message = "User ID is required")
    private String id;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    private String name;
    private List<String> allergens;
    private String skinType;
    private boolean hasAcne = false;
    private String picture;
}
