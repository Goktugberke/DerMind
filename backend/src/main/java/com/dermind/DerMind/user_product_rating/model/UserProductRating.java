package com.dermind.DerMind.user_product_rating.model;

import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_product_ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProductRating {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "rating", nullable = false)
    private Integer rating; // 1-10 arası puan

    @Column(name = "personalized_rating")
    private Double personalizedRating; // Kişiye özel hesaplanan puan

    @Column(name = "review", length = 2000)
    private String review; // Kullanıcı yorumu

    @Column(name = "skin_improvement")
    private Boolean skinImprovement; // Cilt iyileşmesi oldu mu?

    @Column(name = "would_recommend")
    private Boolean wouldRecommend; // Tavsiye eder mi?

    @Column(name = "usage_duration") // Kaç gün/hafta kullandı
    private Integer usageDuration;

    @Column(name = "usage_duration_unit") // DAYS, WEEKS, MONTHS
    private String usageDurationUnit;

    @Column(name = "pros", length = 1000) // Artıları
    private String pros;

    @Column(name = "cons", length = 1000) // Eksileri
    private String cons;

    @Column(name = "verified_purchase")
    private Boolean verifiedPurchase = false; // Doğrulanmış alım mı?

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