package com.dermind.DerMind.product.repository;

import com.dermind.DerMind.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Marka adına göre ürünleri bulma
    List<Product> findByBrand(String brand);

    // Ürün adına göre arama (case insensitive)
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Product> searchByName(@Param("name") String name);

    // Marka adına göre arama (case insensitive)
    @Query("SELECT p FROM Product p WHERE LOWER(p.brand) LIKE LOWER(CONCAT('%', :brand, '%'))")
    List<Product> searchByBrand(@Param("brand") String brand);

    // Belirli kalite puanının üzerindeki ürünleri bulma
    List<Product> findByQualityScoreGreaterThanEqual(Double minScore);

    // Belirli içeriğe sahip ürünleri bulma
    @Query("SELECT p FROM Product p WHERE LOWER(p.ingredients) LIKE LOWER(CONCAT('%', :ingredient, '%'))")
    List<Product> findByIngredientContaining(@Param("ingredient") String ingredient);

    // Belirli içeriğe sahip OLMAYAN ürünleri bulma (alerjen için)
    @Query("SELECT p FROM Product p WHERE LOWER(p.ingredients) NOT LIKE LOWER(CONCAT('%', :allergen, '%'))")
    List<Product> findProductsWithoutAllergen(@Param("allergen") String allergen);

    // En yüksek kalite puanına sahip ürünler
    @Query("SELECT p FROM Product p ORDER BY p.qualityScore DESC")
    List<Product> findTopQualityProducts();

    // En çok satın alınan ürünler
    @Query("SELECT p FROM Product p LEFT JOIN p.purchases pur GROUP BY p.id ORDER BY COUNT(pur) DESC")
    List<Product> findMostPurchasedProducts();

    // En yüksek kullanıcı puanına sahip ürünler
    @Query("SELECT p FROM Product p LEFT JOIN p.ratings r GROUP BY p.id ORDER BY AVG(r.score) DESC")
    List<Product> findHighestRatedProducts();

    // Marka ve isimle arama
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Product> searchProducts(@Param("searchTerm") String searchTerm);
}