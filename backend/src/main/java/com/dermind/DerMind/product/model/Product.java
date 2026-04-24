package com.dermind.DerMind.product.model;

import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
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
    private String ingredients;       // İçerik listesi (örn. "Aloe Vera, Glycerin, ...")
    private Double qualityScore;      // Malzeme kalitesine göre belirlenen puan

    // AI entegrasyonu için gerekli alanlar
    private String sephoraProductId;  // CSV veri setindeki product_id (AI server ile köprü)
    private Double price;             // Fiyat (TL)
    private Double priceUsd;          // Fiyat (USD)
    private String category;          // Üst kategori (örn. "Skincare", "Makeup")
    private String secondaryCategory; // Alt kategori (örn. "Moisturizers", "Sunscreen")
    private Double sephoraRating;     // Sephora platformundaki ortalama puan (1-5)
    private Double baseScore;         // Modelin hesapladığı ham baz puan (1-10)

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<UserProductRating> ratings = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<Purchase> purchases = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<Streak> streaks = new ArrayList<>();

    // getter-setter
}
