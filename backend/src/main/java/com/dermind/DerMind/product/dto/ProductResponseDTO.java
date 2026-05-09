package com.dermind.DerMind.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO for Product Response
@Data
@Builder
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
    private String imageUrl;
    private boolean hiddenStatus;

    public boolean getHiddenStatus() {
        return hiddenStatus;
    }

    public void setHiddenStatus(boolean hiddenStatus) {
        this.hiddenStatus = hiddenStatus;
    }
}
