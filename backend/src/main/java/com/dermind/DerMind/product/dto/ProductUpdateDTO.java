package com.dermind.DerMind.product.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO for Product Update
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductUpdateDTO {
    private String name;
    private String brand;
    private String ingredients;

    @DecimalMin(value = "0.0", message = "Quality score must be at least 0")
    @DecimalMax(value = "10.0", message = "Quality score must be at most 10")
    private Double qualityScore;
}
