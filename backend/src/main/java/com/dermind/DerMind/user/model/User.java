package com.dermind.DerMind.user.model;

import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.favorite.model.Favorite;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @Column(name = "id")
    @NotNull
    private String id;

    @Column(name = "provider")
    private String provider;

    @Column(name = "provider_id", unique = true)
    private String providerId;

    @Column(name = "email", unique = true)
    @NotNull
    @NotNull
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "picture")
    private String picture;

    @Column(name = "allergens")
    private String allergens;

    @Column(name = "skin_type")
    private String skinType;

    @Column(name = "has_acne")
    private boolean hasAcne = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Purchase> purchases = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UserProductRating> ratings = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Streak> streaks = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Favorite> favorites = new ArrayList<>();
}
