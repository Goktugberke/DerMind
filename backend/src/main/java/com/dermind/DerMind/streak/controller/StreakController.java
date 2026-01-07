package com.dermind.DerMind.streak.controller;

import com.dermind.DerMind.streak.dto.*;
import com.dermind.DerMind.streak.service.StreakService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/streaks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StreakController {

    private final StreakService streakService;

    /**
     * Create new streak
     * POST /api/streaks
     */
    @PostMapping
    public ResponseEntity<?> createStreak(@Valid @RequestBody StreakCreateDTO dto) {
        try {
            StreakResponseDTO createdStreak = streakService.createStreak(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdStreak);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all streaks
     * GET /api/streaks
     */
    @GetMapping
    public ResponseEntity<List<StreakResponseDTO>> getAllStreaks() {
        List<StreakResponseDTO> streaks = streakService.getAllStreaks();
        return ResponseEntity.ok(streaks);
    }

    /**
     * Get streak by ID
     * GET /api/streaks/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getStreakById(@PathVariable Long id) {
        try {
            StreakResponseDTO streak = streakService.getStreakById(id);
            return ResponseEntity.ok(streak);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get streaks by user ID
     * GET /api/streaks/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<StreakResponseDTO>> getStreaksByUserId(@PathVariable String userId) {
        List<StreakResponseDTO> streaks = streakService.getStreaksByUserId(userId);
        return ResponseEntity.ok(streaks);
    }

    /**
     * Get active streaks by user ID
     * GET /api/streaks/user/{userId}/active
     */
    @GetMapping("/user/{userId}/active")
    public ResponseEntity<List<StreakResponseDTO>> getActiveStreaksByUserId(@PathVariable String userId) {
        List<StreakResponseDTO> streaks = streakService.getActiveStreaksByUserId(userId);
        return ResponseEntity.ok(streaks);
    }

    /**
     * Get top streaks by user ID
     * GET /api/streaks/user/{userId}/top
     */
    @GetMapping("/user/{userId}/top")
    public ResponseEntity<List<StreakResponseDTO>> getTopStreaksByUserId(@PathVariable String userId) {
        List<StreakResponseDTO> streaks = streakService.getTopStreaksByUserId(userId);
        return ResponseEntity.ok(streaks);
    }

    /**
     * Update streak
     * PUT /api/streaks/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStreak(
            @PathVariable Long id,
            @Valid @RequestBody StreakUpdateDTO dto) {
        try {
            StreakResponseDTO updatedStreak = streakService.updateStreak(id, dto);
            return ResponseEntity.ok(updatedStreak);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Record product usage
     * POST /api/streaks/{id}/use
     */
    @PostMapping("/{id}/use")
    public ResponseEntity<?> recordUsage(@PathVariable Long id) {
        try {
            StreakResponseDTO updatedStreak = streakService.recordUsage(id);
            return ResponseEntity.ok(updatedStreak);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete streak
     * DELETE /api/streaks/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStreak(@PathVariable Long id) {
        try {
            streakService.deleteStreak(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}