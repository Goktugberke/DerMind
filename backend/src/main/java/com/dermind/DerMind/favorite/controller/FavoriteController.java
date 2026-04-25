package com.dermind.DerMind.favorite.controller;

import com.dermind.DerMind.error.UserNotAuthenticatedException;
import com.dermind.DerMind.favorite.dto.FavoriteResponseDTO;
import com.dermind.DerMind.favorite.service.FavoriteService;
import com.dermind.DerMind.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final UserService userService;

    @PostMapping("/{productId}")
    public ResponseEntity<FavoriteResponseDTO> addFavorite(
            @AuthenticationPrincipal Object principal,
            @PathVariable Long productId) {
        String userId = getUserIdFromPrincipal(principal);
        FavoriteResponseDTO response = favoriteService.addFavorite(userId, productId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFavorite(
            @AuthenticationPrincipal Object principal,
            @PathVariable Long productId) {
        String userId = getUserIdFromPrincipal(principal);
        favoriteService.removeFavorite(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-favorites")
    public ResponseEntity<List<FavoriteResponseDTO>> getMyFavorites(
            @AuthenticationPrincipal Object principal) {
        String userId = getUserIdFromPrincipal(principal);
        List<FavoriteResponseDTO> favorites = favoriteService.getMyFavorites(userId);
        return ResponseEntity.ok(favorites);
    }

    @GetMapping("/check/{productId}")
    public ResponseEntity<Boolean> checkIsFavorite(
            @AuthenticationPrincipal Object principal,
            @PathVariable Long productId) {
        String userId = getUserIdFromPrincipal(principal);
        boolean isFavorite = favoriteService.checkIsFavorite(userId, productId);
        return ResponseEntity.ok(isFavorite);
    }

    private String getUserIdFromPrincipal(Object principal) {
        if (principal == null) {
            throw new UserNotAuthenticatedException("Bu işlemi gerçekleştirmek için giriş yapmalısınız.");
        }
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            String email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            return userService.getUserByEmail(email).getId();
        }
        if (principal instanceof OidcUser) {
            String providerId = ((OidcUser) principal).getSubject();
            return "google_" + providerId;
        }
        throw new UserNotAuthenticatedException(
                "Desteklenmeyen kimlik doğrulama türü: " + principal.getClass().getName());
    }
}
