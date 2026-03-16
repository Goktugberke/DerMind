package com.dermind.DerMind.favorite.dto;

import com.dermind.DerMind.product.dto.ProductResponseDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FavoriteResponseDTO {
    private Long id;
    private ProductResponseDTO product;
    private LocalDateTime createdAt;
}
