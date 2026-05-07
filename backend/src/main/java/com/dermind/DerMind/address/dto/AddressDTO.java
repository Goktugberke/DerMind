package com.dermind.DerMind.address.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressDTO {
    private Long id;
    private String title;
    private String city;
    private String zipCode;
    private String addressString;
    private boolean isDefault;
    private LocalDateTime createdAt;
}
