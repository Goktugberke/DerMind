package com.dermind.DerMind.streak.model;

import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "streaks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Streak {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "current_streak", nullable = false)
    private Integer currentStreak = 0; // Mevcut seri

    @Column(name = "longest_streak", nullable = false)
    private Integer longestStreak = 0; // En uzun seri

    @Column(name = "last_used_date")
    private LocalDate lastUsedDate; // Son kullanım tarihi

    @Column(name = "usage_frequency") // DAILY, TWICE_DAILY, WEEKLY vb.
    private String usageFrequency;

    @Column(name = "usage_time") // MORNING, EVENING, BOTH vb.
    private String usageTime;

    @Column(name = "total_uses", nullable = false)
    private Integer totalUses = 0; // Toplam kullanım sayısı

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true; // Seri aktif mi?

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}