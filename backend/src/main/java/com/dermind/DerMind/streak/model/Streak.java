package com.dermind.DerMind.streak.model;

import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "streaks")
public class Streak {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int currentStreak;    // ardışık gün sayısı
    private LocalDate lastUsedDate; // son kullanıldığı tarih
    private LocalDate startedDate;  // serinin başladığı tarih

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    // getter-setter
}

