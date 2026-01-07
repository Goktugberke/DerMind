package com.dermind.DerMind.streak.repository;

import com.dermind.DerMind.streak.model.Streak;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StreakRepository extends JpaRepository<Streak, Long> {

    List<Streak> findByUserId(String userId);

    List<Streak> findByUserIdAndIsActive(String userId, Boolean isActive);

    Optional<Streak> findByUserIdAndProductId(String userId, Long productId);

    List<Streak> findByProductId(Long productId);

    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId ORDER BY s.currentStreak DESC")
    List<Streak> findTopStreaksByUserId(@Param("userId") String userId);

    @Query("SELECT s FROM Streak s WHERE s.lastUsedDate = :date AND s.isActive = true")
    List<Streak> findActiveStreaksByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.currentStreak > 0 ORDER BY s.currentStreak DESC")
    List<Streak> findActiveStreaksByUser(@Param("userId") String userId);
}