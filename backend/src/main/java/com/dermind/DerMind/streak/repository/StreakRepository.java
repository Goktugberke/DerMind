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

    // MEVCUT METODLAR (Değişmeden kalacak)
    List<Streak> findByUserId(String userId);

    List<Streak> findByProductId(Long productId);

    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId ORDER BY s.currentStreak DESC")
    List<Streak> findTopStreaksByUserId(@Param("userId") String userId);

    @Query("SELECT s FROM Streak s WHERE s.lastUsedDate = :date AND s.isActive = true")
    List<Streak> findActiveStreaksByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.currentStreak > 0 ORDER BY s.currentStreak DESC")
    List<Streak> findActiveStreaksByUser(@Param("userId") String userId);

    // YENİ EKLENECEK METODLAR (StreakService için gerekli)

    /**
     * Kullanıcı ID'si ve Ürün ID'sine göre streak arar
     * Aynı kullanıcının aynı ürün için birden fazla streak oluşturmasını engellemek için
     */
    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.product.id = :productId")
    Optional<Streak> findByUserIdAndProductId(@Param("userId") String userId,
                                              @Param("productId") Long productId);

    /**
     * Kullanıcı ID'si ve aktiflik durumuna göre streakları bulur
     */
    @Query("SELECT s FROM Streak s WHERE s.user.id = :userId AND s.isActive = :isActive")
    List<Streak> findByUserIdAndIsActive(@Param("userId") String userId,
                                         @Param("isActive") Boolean isActive);
}