package com.dermind.DerMind.purchase.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseCreateDTO {
    private String userId;
    private Long productId;
    private Integer quantity;
    private BigDecimal unitPrice;
    private String paymentMethod;
    private String shippingAddress;
    private String notes;
}