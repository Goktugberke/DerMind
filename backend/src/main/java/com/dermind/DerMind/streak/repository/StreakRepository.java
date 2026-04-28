package com.dermind.DerMind.streak.repository;

import com.dermind.DerMind.streak.model.Streak;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StreakRepository extends JpaRepository<Streak, Long> {

    @EntityGraph(attributePaths = {"user", "product"})
    List<Streak> findByUserId(String userId);

    @EntityGraph(attributePaths = {"user", "product"})
    List<Streak> findByProductId(Long productId);

    @EntityGraph(attributePaths = {"user", "product"})
    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId ORDER BY s.currentStreak DESC")
    List<Streak> findTopStreaksByUserId(@Param("userId") String userId);

    @EntityGraph(attributePaths = {"user", "product"})
    @Query("SELECT s FROM Streak s WHERE s.lastUsedDate = :date AND s.isActive = true")
    List<Streak> findActiveStreaksByDate(@Param("date") LocalDate date);

    @EntityGraph(attributePaths = {"user", "product"})
    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.currentStreak > 0 ORDER BY s.currentStreak DESC")
    List<Streak> findActiveStreaksByUser(@Param("userId") String userId);

    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.product.id = :productId")
    Optional<Streak> findByUserIdAndProductId(@Param("userId") String userId,
                                              @Param("productId") Long productId);

    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.isActive = :isActive")
    List<Streak> findByUserIdAndIsActive(@Param("userId") String userId,
                                         @Param("isActive") Boolean isActive);

    /**
     * Tehlikedeki seriler — bugün kullanılmamış, ama dün kullanılmış (1 gün boşluk).
     * DB-side filtre, RAM'a tüm streak'leri yüklemekten kaçınır.
     */
    @EntityGraph(attributePaths = {"user", "product"})
    @Query("SELECT s FROM Streak s WHERE s.currentStreak > 0 AND s.isActive = true " +
           "AND s.lastUsedDate = :yesterday")
    List<Streak> findStreaksAtRisk(@Param("yesterday") LocalDate yesterday);

    /**
     * Bozulmuş seriler — son kullanım tarihi 2+ gün önce ve currentStreak hâlâ > 0.
     */
    @EntityGraph(attributePaths = {"user", "product"})
    @Query("SELECT s FROM Streak s WHERE s.currentStreak > 0 " +
           "AND s.lastUsedDate IS NOT NULL AND s.lastUsedDate < :cutoff")
    List<Streak> findExpiredStreaks(@Param("cutoff") LocalDate cutoff);
}
