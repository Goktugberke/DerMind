package com.dermind.DerMind.cart.controller;

import com.dermind.DerMind.cart.dto.CartItemAddDTO;
import com.dermind.DerMind.cart.dto.CartItemResponseDTO;
import com.dermind.DerMind.cart.service.CartService;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Validated
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<List<CartItemResponseDTO>> getCart(@CurrentUser User user) {
        return ResponseEntity.ok(cartService.getCart(user.getId()));
    }

    @PostMapping("/add")
    public ResponseEntity<CartItemResponseDTO> addItem(
            @CurrentUser User user,
            @Valid @RequestBody CartItemAddDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cartService.addItem(user.getId(), dto.getProductId(), dto.getQuantity()));
    }

    @PutMapping("/item/{productId}")
    public ResponseEntity<CartItemResponseDTO> updateQuantity(
            @CurrentUser User user,
            @PathVariable Long productId,
            @RequestParam int quantity) {
        CartItemResponseDTO updated = cartService.updateQuantity(user.getId(), productId, quantity);
        if (updated == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/item/{productId}")
    public ResponseEntity<Void> removeItem(@CurrentUser User user, @PathVariable Long productId) {
        cartService.removeItem(user.getId(), productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@CurrentUser User user) {
        cartService.clearCart(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/merge")
    public ResponseEntity<List<CartItemResponseDTO>> mergeCart(
            @CurrentUser User user,
            @Valid @RequestBody List<CartItemAddDTO> localItems) {
        return ResponseEntity.ok(cartService.mergeCart(user.getId(), localItems));
    }
}
