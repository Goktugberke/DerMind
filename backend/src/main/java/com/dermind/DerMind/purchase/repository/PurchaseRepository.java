package com.dermind.DerMind.purchase.repository;

import com.dermind.DerMind.common.enums.OrderStatus; // Import Ekle
import com.dermind.DerMind.purchase.model.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    List<Purchase> findByUserId(String userId);
    List<Purchase> findByProductId(Long productId);

    List<Purchase> findByOrderStatus(OrderStatus orderStatus);

    List<Purchase> findByUserIdAndOrderStatus(String userId, OrderStatus orderStatus);

    @Query("SELECT p FROM Purchase p WHERE p.user.id = :userId ORDER BY p.purchasedAt DESC")
    List<Purchase> findRecentPurchasesByUserId(@Param("userId") String userId);

    @Query("SELECT p FROM Purchase p WHERE p.purchasedAt BETWEEN :startDate AND :endDate")
    List<Purchase> findPurchasesByDateRange(@Param("startDate") LocalDateTime startDate,
                                            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT p FROM Purchase p WHERE p.user.id = :userId AND p.purchasedAt BETWEEN :startDate AND :endDate")
    List<Purchase> findUserPurchasesByDateRange(@Param("userId") String userId,
                                                @Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(p) FROM Purchase p WHERE p.user.id = :userId")
    Long countPurchasesByUserId(@Param("userId") String userId);

    @Query("SELECT SUM(p.totalPrice) FROM Purchase p WHERE p.user.id = :userId AND p.paymentStatus = 'COMPLETED'")
    java.math.BigDecimal getTotalSpendingByUserId(@Param("userId") String userId);

    @Query("SELECT p FROM Purchase p WHERE p.userId = :userId AND p.createdAt > :since")
    List<Purchase> findRecentPurchasesByUser(String userId, LocalDateTime since);

    @Query("SELECT COUNT(p) FROM Purchase p WHERE p.userId = :userId")
    Long countByUserId(String userId);

    @Query("SELECT SUM(p.totalPrice) FROM Purchase p WHERE p.userId = :userId")
    Double sumTotalPriceByUserId(String userId);
}