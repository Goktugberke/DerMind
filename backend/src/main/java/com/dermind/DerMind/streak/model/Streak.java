package com.dermind.DerMind.streak.model;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.common.enums.UsageTime;
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
@Getter
@Setter
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
    private Integer currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    private Integer longestStreak = 0;

    @Column(name = "last_used_date")
    private LocalDate lastUsedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_frequency")
    private UsageFrequency usageFrequency;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_time")
    private UsageTime usageTime;

    @Column(name = "daily_usage_counter", nullable = false)
    private Integer dailyUsageCounter = 0;

    @Column(name = "total_uses", nullable = false)
    private Integer totalUses = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}