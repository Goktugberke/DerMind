package com.dermind.DerMind.purchase.dto;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.common.enums.PaymentStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseUpdateDTO {
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
    private String trackingNumber;
    private String notes;
}