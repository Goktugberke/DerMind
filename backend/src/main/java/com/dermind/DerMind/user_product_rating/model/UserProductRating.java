package com.dermind.DerMind.user_product_rating.model;

import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "user_product_ratings")
public class UserProductRating {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double score; // kullanıcı-ürün eşleşme puanı (0-100)

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    // getter-setter
}

