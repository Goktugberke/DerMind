package com.dermind.DerMind.user_product_rating.repository;

import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserProductRatingRepository extends JpaRepository<UserProductRating, Long> {

    List<UserProductRating> findByUserId(String userId);

    List<UserProductRating> findByProductId(Long productId);

    Optional<UserProductRating> findByUserIdAndProductId(String userId, Long productId);

    @Query("SELECT r FROM UserProductRating r WHERE r.product.id = :productId ORDER BY r.createdAt DESC")
    List<UserProductRating> findRecentRatingsByProductId(@Param("productId") Long productId);

    @Query("SELECT r FROM UserProductRating r WHERE r.verifiedPurchase = true AND r.product.id = :productId")
    List<UserProductRating> findVerifiedRatingsByProductId(@Param("productId") Long productId);

    @Query("SELECT AVG(r.rating) FROM UserProductRating r WHERE r.product.id = :productId")
    Double getAverageRatingByProductId(@Param("productId") Long productId);

    @Query("SELECT AVG(r.personalizedRating) FROM UserProductRating r WHERE r.product.id = :productId")
    Double getAveragePersonalizedRatingByProductId(@Param("productId") Long productId);

    @Query("SELECT COUNT(r) FROM UserProductRating r WHERE r.product.id = :productId AND r.wouldRecommend = true")
    Long getRecommendCountByProductId(@Param("productId") Long productId);

    @Query("SELECT COUNT(r) FROM UserProductRating r WHERE r.product.id = :productId AND r.skinImprovement = true")
    Long getSkinImprovementCountByProductId(@Param("productId") Long productId);

    @Query("SELECT r FROM UserProductRating r WHERE r.rating >= :minRating ORDER BY r.rating DESC")
    List<UserProductRating> findTopRatedProducts(@Param("minRating") Integer minRating);
}