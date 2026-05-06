package com.dermind.DerMind.streak.model;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.common.enums.UsageTime;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "streaks", indexes = {
        @Index(name = "idx_streaks_user_id", columnList = "user_id"),
        @Index(name = "idx_streaks_product_id", columnList = "product_id"),
        @Index(name = "idx_streaks_user_product", columnList = "user_id,product_id", unique = true),
        @Index(name = "idx_streaks_last_used", columnList = "last_used_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"user", "product"})
public class Streak {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Optimistic locking — recordUsage'da çift istek race condition'ı önler. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Builder.Default
    @Column(name = "current_streak", nullable = false)
    private Integer currentStreak = 0;

    @Builder.Default
    @Column(name = "longest_streak", nullable = false)
    private Integer longestStreak = 0;

    @Column(name = "last_used_date")
    private LocalDate lastUsedDate;

    @Column(name = "last_completed_date")
    private LocalDate lastCompletedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_frequency", length = 32)
    private UsageFrequency usageFrequency;

    @ElementCollection(targetClass = UsageTime.class, fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "streak_usage_times", joinColumns = @JoinColumn(name = "streak_id"))
    @Column(name = "usage_time")
    private Set<UsageTime> usageTimes;

    @ElementCollection(targetClass = DayOfWeek.class, fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "streak_days_of_week", joinColumns = @JoinColumn(name = "streak_id"))
    @Column(name = "day_of_week")
    private Set<DayOfWeek> daysOfWeek;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "streak_custom_times", joinColumns = @JoinColumn(name = "streak_id"))
    @Column(name = "custom_time")
    private List<LocalTime> customTimes;

    @Builder.Default
    @Column(name = "daily_usage_counter", nullable = false)
    private Integer dailyUsageCounter = 0;

    @Builder.Default
    @Column(name = "total_uses", nullable = false)
    private Integer totalUses = 0;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
