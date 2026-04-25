package com.dermind.DerMind.streak.controller;

import com.dermind.DerMind.error.UserNotAuthenticatedException;
import com.dermind.DerMind.streak.dto.*;
import com.dermind.DerMind.streak.service.StreakService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import com.dermind.DerMind.user.service.UserService; // Import added
import java.util.List;

@RestController
@RequestMapping("/api/streaks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StreakController {

    private final StreakService streakService;
    private final com.dermind.DerMind.user.service.UserService userService;

    /**
     * Create new streak (Güvenli Versiyon)
     * Token'daki kullanıcı için seri oluşturur.
     * POST /api/streaks
     */
    @PostMapping
    public ResponseEntity<StreakResponseDTO> createStreak(
            @AuthenticationPrincipal Object principal,
            @Valid @RequestBody StreakCreateDTO dto) {

        String userId = getUserIdFromPrincipal(principal);
        StreakResponseDTO createdStreak = streakService.createStreak(userId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdStreak);
    }

    /**
     * Get MY streaks (Güvenli Versiyon)
     * Sadece oturum açan kullanıcının serilerini getirir.
     * GET /api/streaks/my-streaks
     */
    @GetMapping("/my-streaks")
    public ResponseEntity<List<StreakResponseDTO>> getMyStreaks(@AuthenticationPrincipal Object principal) {
        String userId = getUserIdFromPrincipal(principal);
        List<StreakResponseDTO> streaks = streakService.getStreaksByUserId(userId);
        return ResponseEntity.ok(streaks);
    }

    /**
     * Get MY active streaks (Güvenli Versiyon)
     * GET /api/streaks/my-streaks/active
     */
    @GetMapping("/my-streaks/active")
    public ResponseEntity<List<StreakResponseDTO>> getMyActiveStreaks(@AuthenticationPrincipal Object principal) {
        String userId = getUserIdFromPrincipal(principal);
        List<StreakResponseDTO> streaks = streakService.getActiveStreaksByUserId(userId);
        return ResponseEntity.ok(streaks);
    }

    /**
     * Get MY top streaks (Güvenli Versiyon)
     * GET /api/streaks/my-streaks/top
     */
    @GetMapping("/my-streaks/top")
    public ResponseEntity<List<StreakResponseDTO>> getMyTopStreaks(@AuthenticationPrincipal Object principal) {
        String userId = getUserIdFromPrincipal(principal);
        List<StreakResponseDTO> streaks = streakService.getTopStreaksByUserId(userId);
        return ResponseEntity.ok(streaks);
    }

    /**
     * Get streak by ID
     * GET /api/streaks/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<StreakResponseDTO> getStreakById(@PathVariable Long id) {
        StreakResponseDTO streak = streakService.getStreakById(id);
        return ResponseEntity.ok(streak);
    }

    /**
     * Record product usage (Bugün kullandım butonu)
     * POST /api/streaks/{id}/use
     */
    @PostMapping("/{id}/use")
    public ResponseEntity<StreakResponseDTO> recordUsage(
            @AuthenticationPrincipal OidcUser principal,
            @PathVariable Long id) {
        String userId = getUserIdFromPrincipal(principal);
        StreakResponseDTO updatedStreak = streakService.recordUsage(userId, id);
        return ResponseEntity.ok(updatedStreak);
    }

    /**
     * Update streak
     * PUT /api/streaks/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<StreakResponseDTO> updateStreak(
            @PathVariable Long id,
            @Valid @RequestBody StreakUpdateDTO dto) {
        StreakResponseDTO updatedStreak = streakService.updateStreak(id, dto);
        return ResponseEntity.ok(updatedStreak);
    }

    /**
     * Delete streak
     * DELETE /api/streaks/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStreak(@PathVariable Long id) {
        streakService.deleteStreak(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Admin Endpoint: Get ALL streaks
     * (Bu genellikle admin paneli için kullanılır)
     * GET /api/streaks/all
     */
    @GetMapping("/all")
    public ResponseEntity<List<StreakResponseDTO>> getAllStreaks() {
        // İstersen buraya @PreAuthorize("hasRole('ADMIN')") ekleyebilirsin
        List<StreakResponseDTO> streaks = streakService.getAllStreaks();
        return ResponseEntity.ok(streaks);
    }

    // --- HELPER METHOD ---

    /**
     * Token'dan kullanıcı ID'sini çıkarır.
     * Destekler:
     * 1. Basic Auth (UserDetails) -> Email ile ID bul
     * 2. OAuth2 (OidcUser) -> Google Subject ile ID bul
     */
    private String getUserIdFromPrincipal(Object principal) {
        if (principal == null) {
            throw new UserNotAuthenticatedException("Bu işlemi gerçekleştirmek için giriş yapmalısınız.");
        }

        // 1. Basic Auth (Email/Password)
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            String email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            // Email'den User ID'yi bulmak için UserService kullan
            return userService.getUserByEmail(email).getId();
        }

        // 2. OAuth2 (Google Login)
        if (principal instanceof OidcUser) {
            // Google Subject ID'sini al ve "google_" prefix'i ile döndür
            // Çünkü UserService.handleGoogleLogin metodunda ID böyle oluşturuluyor:
            // "google_" + providerId
            String providerId = ((OidcUser) principal).getSubject();
            return "google_" + providerId;
        }

        throw new UserNotAuthenticatedException(
                "Desteklenmeyen kimlik doğrulama türü: " + principal.getClass().getName());
    }
}