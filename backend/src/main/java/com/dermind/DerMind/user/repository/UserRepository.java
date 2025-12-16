package com.dermind.DerMind.user.repository;

import com.dermind.DerMind.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    // Email ile kullanıcı bulma
    Optional<User> findByEmail(String email);

    Optional<User> findByProviderId(String providerId);
    // Email varlık kontrolü
    boolean existsByEmail(String email);

    // Cilt tipine göre kullanıcıları listeleme
    List<User> findBySkinType(String skinType);

    // Belirli alerjeni olan kullanıcıları bulma
    @Query("SELECT u FROM User u WHERE u.allergens LIKE %:allergen%")
    List<User> findByAllergenContaining(@Param("allergen") String allergen);

    // İsme göre arama (case insensitive)
    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<User> searchByName(@Param("name") String name);

    // Satın alma yapan kullanıcıları bulma
    @Query("SELECT DISTINCT u FROM User u JOIN u.purchases p")
    List<User> findUsersWithPurchases();

    // En aktif kullanıcıları bulma (en çok satın alma yapanlar)
    @Query("SELECT u FROM User u LEFT JOIN u.purchases p GROUP BY u.id ORDER BY COUNT(p) DESC")
    List<User> findMostActiveUsers();
}