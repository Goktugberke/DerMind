package com.dermind.DerMind.product.model;

import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.favorite.model.Favorite;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_products_sephora_id", columnList = "sephoraProductId", unique = true),
        @Index(name = "idx_products_brand", columnList = "brand"),
        @Index(name = "idx_products_category", columnList = "category"),
        @Index(name = "idx_products_quality_score", columnList = "qualityScore")
})
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"ratings", "purchases", "streaks", "favorites"})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 512)
    private String name;

    @Column(length = 256)
    private String brand;

    @Column(columnDefinition = "TEXT")
    private String ingredients;

    private Double qualityScore;
    private Double baseScore;
    private Double price;

    @Column(unique = true, length = 64)
    private String sephoraProductId;

    @Column(length = 64)
    private String category;

    @Column(length = 64)
    private String secondaryCategory;

    private Double sephoraRating;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @Column(name = "is_hidden", nullable = false)
    private boolean hidden = false;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserProductRating> ratings = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Purchase> purchases = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Streak> streaks = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Favorite> favorites = new ArrayList<>();
}
