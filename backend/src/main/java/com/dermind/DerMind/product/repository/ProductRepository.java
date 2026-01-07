package com.dermind.DerMind.product.repository;

import com.dermind.DerMind.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Marka adına göre ürünleri getir
    List<Product> findByBrand(String brand);

    // Ürün adına göre arama
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Product> searchByName(@Param("name") String name);

    // Genel arama (isim veya marka)
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Product> searchProducts(@Param("searchTerm") String searchTerm);

    // Kalite puanına göre filtreleme
    List<Product> findByQualityScoreGreaterThanEqual(Double minScore);

    // En yüksek kaliteli ürünler
    @Query("SELECT p FROM Product p ORDER BY p.qualityScore DESC")
    List<Product> findTopQualityProducts();

    // ⭐ DÜZELTİLDİ: r.score yerine r.rating kullanıldı
    @Query("SELECT p FROM Product p LEFT JOIN p.ratings r " +
            "GROUP BY p.id ORDER BY AVG(r.rating) DESC")
    List<Product> findHighestRatedProducts();

    // En çok satın alınan ürünler
    @Query("SELECT p FROM Product p LEFT JOIN p.purchases pur " +
            "GROUP BY p.id ORDER BY COUNT(pur.id) DESC")
    List<Product> findMostPurchasedProducts();
}