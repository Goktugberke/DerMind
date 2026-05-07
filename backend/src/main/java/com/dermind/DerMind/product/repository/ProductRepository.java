package com.dermind.DerMind.product.repository;

import com.dermind.DerMind.product.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "UPDATE products SET is_hidden = :hidden WHERE id = :id", nativeQuery = true)
    int updateHiddenStatusNative(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("hidden") boolean hidden);


        Page<Product> findByBrandAndHiddenFalse(String brand, Pageable pageable);
        
        java.util.Optional<Product> findBySephoraProductId(String sephoraProductId);

        @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')) AND p.hidden = false")
        Page<Product> searchByName(@Param("name") String name, Pageable pageable);

        /**
         * Product detail için aggregate stats — tek sorguda avg rating, total ratings,
         * total purchases.
         * In-memory collection iteration'ı önler.
         */
        @Query("SELECT " +
                        "  COALESCE(AVG(r.rating), 0.0) as avgRating, " +
                        "  COUNT(DISTINCT r.id) as totalRatings, " +
                        "  (SELECT COUNT(pu.id) FROM Purchase pu WHERE pu.product.id = :productId) as totalPurchases " +
                        "FROM Product p LEFT JOIN p.ratings r WHERE p.id = :productId GROUP BY p.id")
        java.util.Optional<ProductStats> findProductStats(@Param("productId") Long productId);

        interface ProductStats {
                Double getAvgRating();

                Long getTotalRatings();

                Long getTotalPurchases();
        }

        @Query("SELECT p FROM Product p WHERE (LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND p.hidden = false")
        Page<Product> searchProducts(@Param("searchTerm") String searchTerm, Pageable pageable);

        Page<Product> findByQualityScoreGreaterThanEqualAndHiddenFalse(Double minScore, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.hidden = false ORDER BY p.qualityScore DESC NULLS LAST")
        Page<Product> findTopQualityProducts(Pageable pageable);

        @EntityGraph(attributePaths = { "ratings" })
        @Query("SELECT p FROM Product p LEFT JOIN p.ratings r " +
                        "WHERE p.hidden = false " +
                        "GROUP BY p.id ORDER BY AVG(r.rating) DESC NULLS LAST")
        Page<Product> findHighestRatedProducts(Pageable pageable);

        @Query("SELECT p FROM Product p LEFT JOIN p.purchases pur " +
                        "WHERE p.hidden = false " +
                        "GROUP BY p.id ORDER BY COUNT(pur.id) DESC")
        Page<Product> findMostPurchasedProducts(Pageable pageable);

        @Query("SELECT p FROM Product p WHERE " +
                        "(:searchTerm IS NULL OR :searchTerm = '' OR " +
                        "LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND " +
                        "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
                        "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
                        "(:minQuality IS NULL OR p.qualityScore >= :minQuality) AND " +
                        "p.hidden = false")
        Page<Product> filterProducts(
                        @Param("searchTerm") String searchTerm,
                        @Param("minPrice") Double minPrice,
                        @Param("maxPrice") Double maxPrice,
                        @Param("minQuality") Double minQuality,
                        Pageable pageable);
}
