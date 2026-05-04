package com.dermind.DerMind.user_product_rating.controller;

import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user_product_rating.dto.*;
import com.dermind.DerMind.user_product_rating.service.UserProductRatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
@Validated
public class UserProductRatingController {

    private final UserProductRatingService ratingService;

    @PostMapping
    public ResponseEntity<RatingResponseDTO> createRating(
            @CurrentUser User user,
            @Valid @RequestBody RatingCreateDTO dto) {
        // userId body'den değil auth'tan — IDOR koruması
        dto.setUserId(user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ratingService.createRating(dto));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RatingResponseDTO>> getAllRatings() {
        return ResponseEntity.ok(ratingService.getAllRatings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RatingResponseDTO> getRatingById(@PathVariable Long id) {
        return ResponseEntity.ok(ratingService.getRatingById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RatingResponseDTO>> getRatingsByUserId(@PathVariable String userId) {
        return ResponseEntity.ok(ratingService.getRatingsByUserId(userId));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<RatingResponseDTO>> getRatingsByProductId(@PathVariable Long productId) {
        return ResponseEntity.ok(ratingService.getRatingsByProductId(productId));
    }

    @GetMapping("/product/{productId}/recent")
    public ResponseEntity<List<RatingResponseDTO>> getRecentRatingsByProductId(@PathVariable Long productId) {
        return ResponseEntity.ok(ratingService.getRecentRatingsByProductId(productId));
    }

    @GetMapping("/product/{productId}/verified")
    public ResponseEntity<List<RatingResponseDTO>> getVerifiedRatingsByProductId(@PathVariable Long productId) {
        return ResponseEntity.ok(ratingService.getVerifiedRatingsByProductId(productId));
    }

    @GetMapping("/product/{productId}/stats")
    public ResponseEntity<ProductRatingStatsDTO> getProductRatingStats(@PathVariable Long productId) {
        return ResponseEntity.ok(ratingService.getProductRatingStats(productId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@authz.isRatingOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<RatingResponseDTO> updateRating(
            @PathVariable Long id,
            @Valid @RequestBody RatingUpdateDTO dto) {
        return ResponseEntity.ok(ratingService.updateRating(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@authz.isRatingOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRating(@PathVariable Long id) {
        ratingService.deleteRating(id);
        return ResponseEntity.noContent().build();
    }
}
