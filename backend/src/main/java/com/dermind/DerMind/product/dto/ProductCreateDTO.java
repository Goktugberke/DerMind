package com.dermind.DerMind.product.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;

// DTO for Product Creation
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductCreateDTO {
    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Brand is required")
    private String brand;

    @NotBlank(message = "Ingredients are required")
    private String ingredients;

    @DecimalMin(value = "0.0", message = "Quality score must be at least 0")
    @DecimalMax(value = "10.0", message = "Quality score must be at most 10")
    private Double qualityScore;

    private Double baseScore;
    private Double price;
    private String sephoraProductId;
    private String category;
    private String secondaryCategory;
    private Double sephoraRating;
}

