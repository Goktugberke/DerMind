package com.dermind.DerMind.product.repository;

import com.dermind.DerMind.product.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Marka adına göre ürünleri getir
    Page<Product> findByBrand(String brand, Pageable pageable);

    // Ürün adına göre arama
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Product> searchByName(@Param("name") String name, Pageable pageable);

    // Genel arama (isim veya marka)
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<Product> searchProducts(@Param("searchTerm") String searchTerm, Pageable pageable);

    // Kalite puanına göre filtreleme
    Page<Product> findByQualityScoreGreaterThanEqual(Double minScore, Pageable pageable);

    // En yüksek kaliteli ürünler
    @Query("SELECT p FROM Product p ORDER BY p.qualityScore DESC")
    Page<Product> findTopQualityProducts(Pageable pageable);

    // ⭐ DÜZELTİLDİ: r.score yerine r.rating kullanıldı
    @Query("SELECT p FROM Product p LEFT JOIN p.ratings r " +
            "GROUP BY p.id ORDER BY AVG(r.rating) DESC")
    Page<Product> findHighestRatedProducts(Pageable pageable);

    // En çok satın alınan ürünler
    @Query("SELECT p FROM Product p LEFT JOIN p.purchases pur " +
            "GROUP BY p.id ORDER BY COUNT(pur.id) DESC")
    Page<Product> findMostPurchasedProducts(Pageable pageable);

    // ⭐ GELİŞMİŞ FİLTRELEME: Arama, Fiyat ve Kalite filtrelerini tek seferde yapar
    @Query("SELECT p FROM Product p WHERE " +
           "(:searchTerm IS NULL OR :searchTerm = '' OR " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minQuality IS NULL OR p.qualityScore >= :minQuality)")
    Page<Product> filterProducts(
        @Param("searchTerm") String searchTerm,
        @Param("minPrice") Double minPrice,
        @Param("maxPrice") Double maxPrice,
        @Param("minQuality") Double minQuality,
        Pageable pageable);
}