package com.dermind.DerMind.purchase.model;

import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "purchases")
public class Purchase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate purchaseDate;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    // getter-setter
}
