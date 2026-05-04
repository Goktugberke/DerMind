package com.dermind.DerMind.purchase.controller;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.purchase.dto.*;
import com.dermind.DerMind.purchase.service.PurchaseService;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
@Validated
public class PurchaseController {

    private final PurchaseService purchaseService;

    @PostMapping
    public ResponseEntity<PurchaseResponseDTO> createPurchase(
            @CurrentUser User user,
            @Valid @RequestBody PurchaseCreateDTO dto) {
        PurchaseResponseDTO created = purchaseService.createPurchase(user.getId(), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PurchaseResponseDTO>> getAllPurchases() {
        return ResponseEntity.ok(purchaseService.getAllPurchases());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@authz.isPurchaseOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<PurchaseResponseDTO> getPurchaseById(
            @CurrentUser User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(purchaseService.getPurchaseById(user.getId(), id));
    }

    @GetMapping("/{id}/detail")
    @PreAuthorize("@authz.isPurchaseOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<PurchaseDetailDTO> getPurchaseDetailById(
            @CurrentUser User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(purchaseService.getPurchaseDetailById(user.getId(), id));
    }

    @GetMapping("/my-purchases")
    public ResponseEntity<List<PurchaseResponseDTO>> getMyPurchases(@CurrentUser User user) {
        return ResponseEntity.ok(purchaseService.getPurchasesByUserId(user.getId()));
    }

    @GetMapping("/my-purchases/recent")
    public ResponseEntity<List<PurchaseResponseDTO>> getMyRecentPurchases(@CurrentUser User user) {
        return ResponseEntity.ok(purchaseService.getRecentPurchasesByUserId(user.getId()));
    }

    @GetMapping("/status/{orderStatus}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PurchaseResponseDTO>> getPurchasesByOrderStatus(@PathVariable OrderStatus orderStatus) {
        return ResponseEntity.ok(purchaseService.getPurchasesByOrderStatus(orderStatus));
    }

    @GetMapping("/my-purchases/status/{orderStatus}")
    public ResponseEntity<List<PurchaseResponseDTO>> getMyPurchasesByStatus(
            @CurrentUser User user,
            @PathVariable OrderStatus orderStatus) {
        return ResponseEntity.ok(purchaseService.getPurchasesByUserIdAndStatus(user.getId(), orderStatus));
    }

    @GetMapping("/my-purchases/stats")
    public ResponseEntity<Map<String, Object>> getMyPurchaseStats(@CurrentUser User user) {
        return ResponseEntity.ok(Map.of(
                "totalPurchases", purchaseService.getTotalPurchaseCountByUserId(user.getId()),
                "totalSpending", purchaseService.getTotalSpendingByUserId(user.getId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@authz.isPurchaseOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<PurchaseResponseDTO> updatePurchase(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseUpdateDTO dto) {
        return ResponseEntity.ok(purchaseService.updatePurchase(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@authz.isPurchaseOwner(#id) or hasRole('ADMIN')")
    public ResponseEntity<Void> deletePurchase(@PathVariable Long id) {
        purchaseService.deletePurchase(id);
        return ResponseEntity.noContent().build();
    }
}
