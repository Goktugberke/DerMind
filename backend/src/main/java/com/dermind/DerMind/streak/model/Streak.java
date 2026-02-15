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

    @Column(name = "last_completed_date")
    private LocalDate lastCompletedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_frequency")
    private UsageFrequency usageFrequency;

    @ElementCollection(targetClass = UsageTime.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "streak_usage_times", joinColumns = @JoinColumn(name = "streak_id"))
    @Column(name = "usage_time")
    private java.util.Set<UsageTime> usageTimes;

    @ElementCollection(targetClass = java.time.DayOfWeek.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "streak_days_of_week", joinColumns = @JoinColumn(name = "streak_id"))
    @Column(name = "day_of_week")
    private java.util.Set<java.time.DayOfWeek> daysOfWeek;

    @ElementCollection
    @CollectionTable(name = "streak_custom_times", joinColumns = @JoinColumn(name = "streak_id"))
    @Column(name = "custom_time")
    private java.util.List<java.time.LocalTime> customTimes;

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