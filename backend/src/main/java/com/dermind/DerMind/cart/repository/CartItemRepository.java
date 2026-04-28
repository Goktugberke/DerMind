package com.dermind.DerMind.cart.repository;

import com.dermind.DerMind.cart.model.CartItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @EntityGraph(attributePaths = {"product"})
    List<CartItem> findByUserId(String userId);

    Optional<CartItem> findByUserIdAndProductId(String userId, Long productId);

    void deleteByUserId(String userId);

    void deleteByUserIdAndProductId(String userId, Long productId);
}
