package com.dermind.DerMind.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;

@Data
@Builder
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

    // AI server entegrasyonu için — CSV veri setindeki product_id ile eşleşir
    private String sephoraProductId;

    private Double price;
    private Double priceUsd;
    private String category;
    private String secondaryCategory;

    @DecimalMin(value = "1.0", message = "Sephora rating must be at least 1")
    @DecimalMax(value = "5.0", message = "Sephora rating must be at most 5")
    private Double sephoraRating;

    @DecimalMin(value = "0.0", message = "Base score must be at least 0")
    @DecimalMax(value = "10.0", message = "Base score must be at most 10")
    private Double baseScore;
}

