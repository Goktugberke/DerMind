package com.dermind.DerMind.user_product_rating.controller;

import com.dermind.DerMind.user_product_rating.dto.*;
import com.dermind.DerMind.user_product_rating.service.UserProductRatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserProductRatingController {

    private final UserProductRatingService ratingService;

    /**
     * Create new rating
     * POST /api/ratings
     */
    @PostMapping
    public ResponseEntity<?> createRating(@Valid @RequestBody RatingCreateDTO dto) {
        try {
            RatingResponseDTO createdRating = ratingService.createRating(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdRating);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all ratings
     * GET /api/ratings
     */
    @GetMapping
    public ResponseEntity<List<RatingResponseDTO>> getAllRatings() {
        List<RatingResponseDTO> ratings = ratingService.getAllRatings();
        return ResponseEntity.ok(ratings);
    }

    /**
     * Get rating by ID
     * GET /api/ratings/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getRatingById(@PathVariable Long id) {
        try {
            RatingResponseDTO rating = ratingService.getRatingById(id);
            return ResponseEntity.ok(rating);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get ratings by user ID
     * GET /api/ratings/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RatingResponseDTO>> getRatingsByUserId(@PathVariable String userId) {
        List<RatingResponseDTO> ratings = ratingService.getRatingsByUserId(userId);
        return ResponseEntity.ok(ratings);
    }

    /**
     * Get ratings by product ID
     * GET /api/ratings/product/{productId}
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<RatingResponseDTO>> getRatingsByProductId(@PathVariable Long productId) {
        List<RatingResponseDTO> ratings = ratingService.getRatingsByProductId(productId);
        return ResponseEntity.ok(ratings);
    }

    /**
     * Get recent ratings by product ID
     * GET /api/ratings/product/{productId}/recent
     */
    @GetMapping("/product/{productId}/recent")
    public ResponseEntity<List<RatingResponseDTO>> getRecentRatingsByProductId(@PathVariable Long productId) {
        List<RatingResponseDTO> ratings = ratingService.getRecentRatingsByProductId(productId);
        return ResponseEntity.ok(ratings);
    }

    /**
     * Get verified ratings by product ID
     * GET /api/ratings/product/{productId}/verified
     */
    @GetMapping("/product/{productId}/verified")
    public ResponseEntity<List<RatingResponseDTO>> getVerifiedRatingsByProductId(@PathVariable Long productId) {
        List<RatingResponseDTO> ratings = ratingService.getVerifiedRatingsByProductId(productId);
        return ResponseEntity.ok(ratings);
    }

    /**
     * Get product rating statistics
     * GET /api/ratings/product/{productId}/stats
     */
    @GetMapping("/product/{productId}/stats")
    public ResponseEntity<?> getProductRatingStats(@PathVariable Long productId) {
        try {
            ProductRatingStatsDTO stats = ratingService.getProductRatingStats(productId);
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update rating
     * PUT /api/ratings/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRating(
            @PathVariable Long id,
            @Valid @RequestBody RatingUpdateDTO dto) {
        try {
            RatingResponseDTO updatedRating = ratingService.updateRating(id, dto);
            return ResponseEntity.ok(updatedRating);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete rating
     * DELETE /api/ratings/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRating(@PathVariable Long id) {
        try {
            ratingService.deleteRating(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}