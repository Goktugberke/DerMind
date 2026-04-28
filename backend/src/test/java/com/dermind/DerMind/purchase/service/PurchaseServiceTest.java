package com.dermind.DerMind.purchase.service;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.common.enums.PaymentMethod;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.purchase.dto.PurchaseCreateDTO;
import com.dermind.DerMind.purchase.dto.PurchaseResponseDTO;
import com.dermind.DerMind.purchase.dto.PurchaseUpdateDTO;
import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {

    @Mock PurchaseRepository purchaseRepository;
    @Mock UserRepository userRepository;
    @Mock ProductRepository productRepository;

    @InjectMocks PurchaseService purchaseService;

    private User makeUser(String id) {
        User u = new User();
        u.setId(id);
        u.setName("Test User");
        return u;
    }

    private Product makeProduct(Long id) {
        Product p = new Product();
        p.setId(id);
        p.setName("Test Product");
        p.setBrand("Brand");
        p.setQualityScore(7.5);
        p.setIngredients("water");
        return p;
    }

    private Purchase makePurchase(Long id, User user, Product product) {
        return Purchase.builder()
                .id(id)
                .user(user)
                .product(product)
                .quantity(2)
                .unitPrice(new BigDecimal("50.00"))
                .totalPrice(new BigDecimal("100.00"))
                .orderStatus(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .shippingAddress("Test Street 1")
                .build();
    }

    // ── createPurchase ──────────────────────────────────────────────────

    @Test
    @DisplayName("createPurchase: kullanıcı yoksa ResourceNotFoundException")
    void createPurchase_userNotFound_throws() {
        when(userRepository.findById("u1")).thenReturn(Optional.empty());
        PurchaseCreateDTO dto = PurchaseCreateDTO.builder()
                .productId(1L).quantity(1)
                .unitPrice(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .shippingAddress("Test Address 12345")
                .build();

        assertThatThrownBy(() -> purchaseService.createPurchase("u1", dto))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(purchaseRepository, never()).save(any());
    }

    @Test
    @DisplayName("createPurchase: ürün yoksa ResourceNotFoundException")
    void createPurchase_productNotFound_throws() {
        when(userRepository.findById("u1")).thenReturn(Optional.of(makeUser("u1")));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());
        PurchaseCreateDTO dto = PurchaseCreateDTO.builder()
                .productId(99L).quantity(1)
                .unitPrice(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .shippingAddress("Test Address 12345")
                .build();

        assertThatThrownBy(() -> purchaseService.createPurchase("u1", dto))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createPurchase: totalPrice = unitPrice × quantity doğru hesaplanır")
    void createPurchase_totalPriceCalculated() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        PurchaseCreateDTO dto = PurchaseCreateDTO.builder()
                .productId(1L).quantity(3)
                .unitPrice(new BigDecimal("25.00"))
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .shippingAddress("Test Address 12345")
                .build();

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(purchaseRepository.save(any(Purchase.class))).thenAnswer(inv -> {
            Purchase p = inv.getArgument(0);
            p.setId(10L);
            return p;
        });

        PurchaseResponseDTO result = purchaseService.createPurchase("u1", dto);

        ArgumentCaptor<Purchase> captor = ArgumentCaptor.forClass(Purchase.class);
        verify(purchaseRepository).save(captor.capture());
        assertThat(captor.getValue().getTotalPrice()).isEqualByComparingTo(new BigDecimal("75.00"));
    }

    @Test
    @DisplayName("createPurchase: OrderStatus başlangıçta PENDING")
    void createPurchase_initialStatusIsPending() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        PurchaseCreateDTO dto = PurchaseCreateDTO.builder()
                .productId(1L).quantity(1)
                .unitPrice(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .shippingAddress("Test Address 12345")
                .build();

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(purchaseRepository.save(any(Purchase.class))).thenAnswer(inv -> {
            Purchase p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        purchaseService.createPurchase("u1", dto);

        ArgumentCaptor<Purchase> captor = ArgumentCaptor.forClass(Purchase.class);
        verify(purchaseRepository).save(captor.capture());
        assertThat(captor.getValue().getOrderStatus()).isEqualTo(OrderStatus.PENDING);
    }

    // ── getPurchaseById ──────────────────────────────────────────────────

    @Test
    @DisplayName("getPurchaseById: sipariş yoksa ResourceNotFoundException")
    void getPurchaseById_notFound_throws() {
        when(purchaseRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> purchaseService.getPurchaseById("u1", 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getPurchaseById: başka kullanıcının siparişi → UnauthorizedAccessException")
    void getPurchaseById_wrongUser_throws() {
        User owner = makeUser("owner");
        Purchase purchase = makePurchase(1L, owner, makeProduct(1L));
        when(purchaseRepository.findById(1L)).thenReturn(Optional.of(purchase));

        assertThatThrownBy(() -> purchaseService.getPurchaseById("attacker", 1L))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    @DisplayName("getPurchaseById: doğru kullanıcı → DTO döner")
    void getPurchaseById_correctUser_returnsDTO() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        Purchase purchase = makePurchase(5L, user, product);
        when(purchaseRepository.findById(5L)).thenReturn(Optional.of(purchase));

        PurchaseResponseDTO result = purchaseService.getPurchaseById("u1", 5L);

        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getUserId()).isEqualTo("u1");
    }

    // ── updatePurchase ───────────────────────────────────────────────────

    @Test
    @DisplayName("updatePurchase: bulunamazsa ResourceNotFoundException")
    void updatePurchase_notFound_throws() {
        when(purchaseRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> purchaseService.updatePurchase(99L, new PurchaseUpdateDTO()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(purchaseRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePurchase: DELIVERED status → deliveredAt set edilir")
    void updatePurchase_deliveredStatus_setsDeliveredAt() {
        User user = makeUser("u1");
        Purchase purchase = makePurchase(1L, user, makeProduct(1L));
        PurchaseUpdateDTO dto = new PurchaseUpdateDTO();
        dto.setOrderStatus(OrderStatus.DELIVERED);

        when(purchaseRepository.findById(1L)).thenReturn(Optional.of(purchase));
        when(purchaseRepository.save(purchase)).thenReturn(purchase);

        purchaseService.updatePurchase(1L, dto);

        assertThat(purchase.getOrderStatus()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(purchase.getDeliveredAt()).isNotNull();
    }

    @Test
    @DisplayName("updatePurchase: trackingNumber güncellenir")
    void updatePurchase_trackingNumber_updated() {
        User user = makeUser("u1");
        Purchase purchase = makePurchase(1L, user, makeProduct(1L));
        PurchaseUpdateDTO dto = new PurchaseUpdateDTO();
        dto.setTrackingNumber("TRACK-123");

        when(purchaseRepository.findById(1L)).thenReturn(Optional.of(purchase));
        when(purchaseRepository.save(purchase)).thenReturn(purchase);

        purchaseService.updatePurchase(1L, dto);

        assertThat(purchase.getTrackingNumber()).isEqualTo("TRACK-123");
    }

    // ── deletePurchase ────────────────────────────────────────────────────

    @Test
    @DisplayName("deletePurchase: bulunamazsa ResourceNotFoundException")
    void deletePurchase_notFound_throws() {
        when(purchaseRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> purchaseService.deletePurchase(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(purchaseRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("deletePurchase: mevcut sipariş silinir")
    void deletePurchase_exists_deletes() {
        when(purchaseRepository.existsById(1L)).thenReturn(true);
        purchaseService.deletePurchase(1L);
        verify(purchaseRepository).deleteById(1L);
    }

    // ── getTotalSpendingByUserId ───────────────────────────────────────────

    @Test
    @DisplayName("getTotalSpendingByUserId: null döner → 0.0 fallback")
    void getTotalSpending_nullResult_returnsZero() {
        when(purchaseRepository.getTotalSpendingByUserId("u1")).thenReturn(null);
        assertThat(purchaseService.getTotalSpendingByUserId("u1")).isEqualTo(0.0);
    }

    @Test
    @DisplayName("getTotalSpendingByUserId: BigDecimal → double dönüşümü doğru")
    void getTotalSpending_returnsDoubleValue() {
        when(purchaseRepository.getTotalSpendingByUserId("u1"))
                .thenReturn(new BigDecimal("250.75"));
        assertThat(purchaseService.getTotalSpendingByUserId("u1")).isEqualTo(250.75);
    }

    // ── getPurchasesByUserId ───────────────────────────────────────────────

    @Test
    @DisplayName("getPurchasesByUserId: boş liste döner")
    void getPurchasesByUserId_empty() {
        when(purchaseRepository.findByUserId("u1")).thenReturn(List.of());
        assertThat(purchaseService.getPurchasesByUserId("u1")).isEmpty();
    }
}
