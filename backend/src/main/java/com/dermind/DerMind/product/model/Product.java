package com.dermind.DerMind.product.model;

import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.favorite.model.Favorite;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String brand;
    private String ingredients;   // İçerik listesi (örn. "Aloe Vera, Glycerin, ...")
    private Double qualityScore;  // Malzeme kalitesine göre belirlenen puan
    private Double price;


    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<UserProductRating> ratings = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<Purchase> purchases = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<Streak> streaks = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<Favorite> favorites = new ArrayList<>();

    // getter-setter
}
