package com.dermind.DerMind.purchase.dto;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.common.enums.PaymentMethod; // YENİ
import com.dermind.DerMind.common.enums.PaymentStatus; // YENİ
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseResponseDTO {
    private Long id;
    private String userId;
    private String userName;
    private Long productId;
    private String productName;
    private String productBrand;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private OrderStatus orderStatus;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private String shippingAddress;
    private String trackingNumber;
    private String notes;
    private LocalDateTime purchasedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}