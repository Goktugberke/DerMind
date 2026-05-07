package com.dermind.DerMind.user.model;

import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.favorite.model.Favorite;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_email", columnList = "email", unique = true),
        @Index(name = "idx_users_skin_type", columnList = "skin_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@ToString(exclude = { "purchases", "ratings", "streaks", "favorites" })
public class User {

    @Id
    @Column(name = "id")
    @NotBlank
    private String id;

    @Column(name = "provider")
    private String provider;

    @Column(name = "provider_id", unique = true)
    private String providerId;

    @Column(name = "email", nullable = false, unique = true)
    @NotBlank
    @Email
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "picture", length = 1024)
    private String picture;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_allergens", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "allergen", length = 128)
    private Set<String> allergens = new LinkedHashSet<>();

    @Column(name = "skin_type", length = 32)
    private String skinType;

    @Column(name = "has_acne", nullable = false)
    private boolean hasAcne = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Purchase> purchases = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserProductRating> ratings = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Streak> streaks = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Favorite> favorites = new ArrayList<>();
}
