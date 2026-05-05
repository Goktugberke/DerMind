package com.dermind.DerMind.user_product_rating.model;

import com.dermind.DerMind.common.enums.UsageDurationUnit;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_product_ratings", indexes = {
        @Index(name = "idx_ratings_user_id", columnList = "user_id"),
        @Index(name = "idx_ratings_product_id", columnList = "product_id"),
        @Index(name = "idx_ratings_user_product", columnList = "user_id,product_id", unique = true),
        @Index(name = "idx_ratings_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"user", "product"})
public class UserProductRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "personalized_rating")
    private Double personalizedRating;

    @Column(name = "review", length = 2000)
    private String review;

    @Column(name = "skin_improvement")
    private Boolean skinImprovement;

    @Column(name = "would_recommend")
    private Boolean wouldRecommend;

    @Column(name = "usage_duration")
    private Integer usageDuration;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_duration_unit", length = 16)
    private UsageDurationUnit usageDurationUnit;

    @Column(name = "pros", length = 1000)
    private String pros;

    @Column(name = "cons", length = 1000)
    private String cons;

    @Builder.Default
    @Column(name = "verified_purchase", nullable = false)
    private Boolean verifiedPurchase = false;

    @Column(name = "usage_frequency_string", length = 255)
    private String usageFrequencyString;

    @Column(name = "usage_amount_string", length = 255)
    private String usageAmountString;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
