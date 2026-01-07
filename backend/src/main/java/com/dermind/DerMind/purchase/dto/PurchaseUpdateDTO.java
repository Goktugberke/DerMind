package com.dermind.DerMind.purchase.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseUpdateDTO {
    private String orderStatus;
    private String paymentStatus;
    private String trackingNumber;
    private String notes;
}