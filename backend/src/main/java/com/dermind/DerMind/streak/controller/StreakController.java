package com.dermind.DerMind.streak.controller;

import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.streak.dto.*;
import com.dermind.DerMind.streak.service.StreakService;
import com.dermind.DerMind.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/streaks")
@RequiredArgsConstructor
@Validated
public class StreakController {

    private final StreakService streakService;

    @PostMapping
    public ResponseEntity<StreakResponseDTO> createStreak(
            @CurrentUser User user,
            @Valid @RequestBody StreakCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(streakService.createStreak(user.getId(), dto));
    }

    @GetMapping("/my-streaks")
    public ResponseEntity<List<StreakResponseDTO>> getMyStreaks(@CurrentUser User user) {
        return ResponseEntity.ok(streakService.getStreaksByUserId(user.getId()));
    }

    @GetMapping("/my-streaks/active")
    public ResponseEntity<List<StreakResponseDTO>> getMyActiveStreaks(@CurrentUser User user) {
        return ResponseEntity.ok(streakService.getActiveStreaksByUserId(user.getId()));
    }

    @GetMapping("/my-streaks/top")
    public ResponseEntity<List<StreakResponseDTO>> getMyTopStreaks(@CurrentUser User user) {
        return ResponseEntity.ok(streakService.getTopStreaksByUserId(user.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@authz.isStreakOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<StreakResponseDTO> getStreakById(@PathVariable Long id) {
        return ResponseEntity.ok(streakService.getStreakById(id));
    }

    @PostMapping("/{id}/use")
    public ResponseEntity<StreakResponseDTO> recordUsage(
            @CurrentUser User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(streakService.recordUsage(user.getId(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@authz.isStreakOwner(#id)")
    public ResponseEntity<StreakResponseDTO> updateStreak(
            @PathVariable Long id,
            @Valid @RequestBody StreakUpdateDTO dto) {
        return ResponseEntity.ok(streakService.updateStreak(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@authz.isStreakOwner(#id)")
    public ResponseEntity<Void> deleteStreak(@PathVariable Long id) {
        streakService.deleteStreak(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StreakResponseDTO>> getAllStreaks() {
        return ResponseEntity.ok(streakService.getAllStreaks());
    }
}
