package com.dermind.DerMind.address.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAddressRequest {
    @NotBlank(message = "Title cannot be blank")
    private String title;

    @NotBlank(message = "City cannot be blank")
    private String city;

    @NotBlank(message = "Zip code cannot be blank")
    private String zipCode;

    @NotBlank(message = "Address string cannot be blank")
    private String addressString;

    private boolean isDefault;
}
