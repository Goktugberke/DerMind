package com.dermind.DerMind.user.model;


import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
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

    @Column(name = "email", unique = true)
    @NotNull
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "allergens")
    private String allergens;    // Virgülle ayrılmış string ya da ayrı tablo (Allergen entity)

    @Column(name = "skinType")
    private String skinType;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Purchase> purchases = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UserProductRating> ratings = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Streak> streaks = new ArrayList<>();
    /**
     * The number of streak freezes available to the user.
     * <p>
     * This value is currently hardcoded to 5. It can be fetched from configuration later on for flexibility.
     */

    private String picture;


}