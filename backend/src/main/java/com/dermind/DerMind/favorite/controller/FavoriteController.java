package com.dermind.DerMind.favorite.controller;

import com.dermind.DerMind.favorite.dto.FavoriteResponseDTO;
import com.dermind.DerMind.favorite.service.FavoriteService;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@Validated
public class FavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping("/{productId}")
    public ResponseEntity<FavoriteResponseDTO> addFavorite(
            @CurrentUser User user,
            @PathVariable Long productId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(favoriteService.addFavorite(user.getId(), productId));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFavorite(
            @CurrentUser User user,
            @PathVariable Long productId) {
        favoriteService.removeFavorite(user.getId(), productId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-favorites")
    public ResponseEntity<List<FavoriteResponseDTO>> getMyFavorites(@CurrentUser User user) {
        return ResponseEntity.ok(favoriteService.getMyFavorites(user.getId()));
    }

    @GetMapping("/check/{productId}")
    public ResponseEntity<Boolean> checkIsFavorite(
            @CurrentUser User user,
            @PathVariable Long productId) {
        return ResponseEntity.ok(favoriteService.checkIsFavorite(user.getId(), productId));
    }
}
