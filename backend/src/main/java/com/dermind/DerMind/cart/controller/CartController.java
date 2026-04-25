package com.dermind.DerMind.cart.controller;

import com.dermind.DerMind.cart.dto.CartItemAddDTO;
import com.dermind.DerMind.cart.dto.CartItemResponseDTO;
import com.dermind.DerMind.cart.service.CartService;
import com.dermind.DerMind.user.dto.UserResponseDTO;
import com.dermind.DerMind.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CartController {

    private final CartService cartService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<CartItemResponseDTO>> getCart(Authentication authentication) {
        String userId = getUserId(authentication);
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @PostMapping("/add")
    public ResponseEntity<CartItemResponseDTO> addItem(Authentication authentication, @RequestBody CartItemAddDTO dto) {
        String userId = getUserId(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cartService.addItem(userId, dto.getProductId(), dto.getQuantity()));
    }

    @PutMapping("/item/{productId}")
    public ResponseEntity<CartItemResponseDTO> updateQuantity(
            Authentication authentication,
            @PathVariable Long productId,
            @RequestParam int quantity) {
        String userId = getUserId(authentication);
        CartItemResponseDTO updated = cartService.updateQuantity(userId, productId, quantity);
        if (updated == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/item/{productId}")
    public ResponseEntity<Void> removeItem(Authentication authentication, @PathVariable Long productId) {
        String userId = getUserId(authentication);
        cartService.removeItem(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(Authentication authentication) {
        String userId = getUserId(authentication);
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/merge")
    public ResponseEntity<List<CartItemResponseDTO>> mergeCart(Authentication authentication, @RequestBody List<CartItemAddDTO> localItems) {
        String userId = getUserId(authentication);
        return ResponseEntity.ok(cartService.mergeCart(userId, localItems));
    }

    private String getUserId(Authentication authentication) {
        if (authentication == null) {
            throw new RuntimeException("Unauthorized");
        }

        String email;
        if (authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal()).getUsername();
        } else if (authentication.getPrincipal() instanceof OidcUser) {
            email = ((OidcUser) authentication.getPrincipal()).getEmail();
        } else {
            throw new RuntimeException("Principal type not supported");
        }

        // Get user by email to get their UID (id field)
        UserResponseDTO user = userService.getUserByEmail(email);
        return user.getId();
    }
}
