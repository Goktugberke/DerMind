package com.dermind.DerMind.cart.dto;

import com.dermind.DerMind.product.dto.ProductResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponseDTO {
    private Long id;
    private ProductResponseDTO product;
    private int quantity;
}
