package com.dermind.DerMind.purchase.controller;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.error.UserNotAuthenticatedException;
import com.dermind.DerMind.purchase.dto.*;
import com.dermind.DerMind.purchase.service.PurchaseService;
import com.dermind.DerMind.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final UserService userService;

    /**
     * Create new purchase
     * POST /api/purchases
     */
    @PostMapping
    public ResponseEntity<?> createPurchase(
            @AuthenticationPrincipal Object principal,
            @Valid @RequestBody PurchaseCreateDTO dto) {
        try {
            String userId = getUserIdFromPrincipal(principal);
            PurchaseResponseDTO createdPurchase = purchaseService.createPurchase(userId, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdPurchase);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all purchases
     * GET /api/purchases
     */
    @GetMapping
    public ResponseEntity<List<PurchaseResponseDTO>> getAllPurchases() {
        List<PurchaseResponseDTO> purchases = purchaseService.getAllPurchases();
        return ResponseEntity.ok(purchases);
    }

    /**
     * Get purchase by ID
     * GET /api/purchases/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPurchaseById(
            @AuthenticationPrincipal Object principal,
            @PathVariable Long id) {

        String userId = getUserIdFromPrincipal(principal);
        PurchaseResponseDTO purchase = purchaseService.getPurchaseById(userId, id);

        return ResponseEntity.ok(purchase);
    }

    /**
     * Get purchase detail by ID
     * GET /api/purchases/{id}/detail
     */
    @GetMapping("/{id}/detail")
    public ResponseEntity<?> getPurchaseDetailById(@PathVariable Long id) {
        try {
            PurchaseDetailDTO purchase = purchaseService.getPurchaseDetailById(id);
            return ResponseEntity.ok(purchase);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get purchases by user ID
     * GET /api/purchases/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PurchaseResponseDTO>> getPurchasesByUserId(@PathVariable String userId) {
        List<PurchaseResponseDTO> purchases = purchaseService.getPurchasesByUserId(userId);
        return ResponseEntity.ok(purchases);
    }

    /**
     * Get recent purchases by user ID
     * GET /api/purchases/user/{userId}/recent
     */
    @GetMapping("/user/{userId}/recent")
    public ResponseEntity<List<PurchaseResponseDTO>> getRecentPurchasesByUserId(@PathVariable String userId) {
        List<PurchaseResponseDTO> purchases = purchaseService.getRecentPurchasesByUserId(userId);
        return ResponseEntity.ok(purchases);
    }

    /**
     * Get purchases by order status
     * GET /api/purchases/status/{orderStatus}
     */
    @GetMapping("/status/{orderStatus}")
    public ResponseEntity<List<PurchaseResponseDTO>> getPurchasesByOrderStatus(@PathVariable OrderStatus orderStatus) {
        // Spring Boot URL'deki String'i otomatik olarak Enum'a çevirir.
        List<PurchaseResponseDTO> purchases = purchaseService.getPurchasesByOrderStatus(orderStatus);
        return ResponseEntity.ok(purchases);
    }

    /**
     * Get purchases by user ID and status
     * GET /api/purchases/user/{userId}/status/{orderStatus}
     */
    @GetMapping("/user/{userId}/status/{orderStatus}")
    public ResponseEntity<List<PurchaseResponseDTO>> getPurchasesByUserIdAndStatus(
            @PathVariable String userId,
            @PathVariable OrderStatus orderStatus) {
        List<PurchaseResponseDTO> purchases = purchaseService.getPurchasesByUserIdAndStatus(userId, orderStatus);
        return ResponseEntity.ok(purchases);
    }

    /**
     * Get user purchase statistics
     * GET /api/purchases/user/{userId}/stats
     */
    @GetMapping("/user/{userId}/stats")
    public ResponseEntity<Map<String, Object>> getUserPurchaseStats(@PathVariable String userId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPurchases", purchaseService.getTotalPurchaseCountByUserId(userId));
        stats.put("totalSpending", purchaseService.getTotalSpendingByUserId(userId));
        return ResponseEntity.ok(stats);
    }

    /**
     * Update purchase
     * PUT /api/purchases/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePurchase(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseUpdateDTO dto) {
        try {
            PurchaseResponseDTO updatedPurchase = purchaseService.updatePurchase(id, dto);
            return ResponseEntity.ok(updatedPurchase);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete purchase
     * DELETE /api/purchases/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePurchase(@PathVariable Long id) {
        try {
            purchaseService.deletePurchase(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String getUserIdFromPrincipal(Object principal) {
        if (principal == null) {
            throw new UserNotAuthenticatedException("Bu işlemi gerçekleştirmek için giriş yapmalısınız.");
        }

        // Firebase JWT → Spring Security bunu UserDetails olarak parse eder (email = username)
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            String email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            return userService.getUserByEmail(email).getId();
        }

        // Google OAuth2 / OidcUser
        if (principal instanceof OidcUser) {
            return ((OidcUser) principal).getSubject();
        }

        throw new UserNotAuthenticatedException(
                "Desteklenmeyen kimlik doğrulama türü: " + principal.getClass().getName());
    }
}