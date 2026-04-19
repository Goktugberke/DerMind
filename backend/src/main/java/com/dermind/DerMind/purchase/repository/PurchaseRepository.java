package com.dermind.DerMind.purchase.repository;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.purchase.model.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    @Query("SELECT p FROM Purchase p WHERE p.user.id = :userId")
    List<Purchase> findByUserId(@Param("userId") String userId);

    List<Purchase> findByProductId(Long productId);

    List<Purchase> findByOrderStatus(OrderStatus orderStatus);

    @Query("SELECT p FROM Purchase p WHERE p.user.id = :userId AND p.orderStatus = :orderStatus")
    List<Purchase> findByUserIdAndOrderStatus(@Param("userId") String userId,
                                              @Param("orderStatus") OrderStatus orderStatus);

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
    BigDecimal getTotalSpendingByUserId(@Param("userId") String userId);

    @Query("SELECT p FROM Purchase p WHERE p.user.id = :userId AND p.createdAt > :since")
    List<Purchase> findRecentPurchasesByUser(@Param("userId") String userId,
                                             @Param("since") LocalDateTime since);
}