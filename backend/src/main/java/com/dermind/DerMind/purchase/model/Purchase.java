package com.dermind.DerMind.purchase.model;

import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchases")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Purchase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "order_status", nullable = false)
    private String orderStatus; // PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

    @Column(name = "payment_method")
    private String paymentMethod; // CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER

    @Column(name = "payment_status")
    private String paymentStatus; // PENDING, COMPLETED, FAILED, REFUNDED

    @Column(name = "shipping_address", length = 500)
    private String shippingAddress;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "purchased_at")
    private LocalDateTime purchasedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}