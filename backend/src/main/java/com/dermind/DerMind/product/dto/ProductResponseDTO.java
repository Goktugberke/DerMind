package com.dermind.DerMind.product.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO for Product Response
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponseDTO {
    private Long id;
    private String name;
    private String brand;
    private String ingredients;
    private Double qualityScore;
    private Double baseScore;
    private Double price;
    private String sephoraProductId;
    private String category;
    private String secondaryCategory;
    private Double sephoraRating;
    private Double personalScore;
}
