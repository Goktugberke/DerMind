package com.dermind.DerMind.purchase.service;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.common.enums.PaymentStatus;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.purchase.dto.*;
import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.mail.service.MailServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final MailServiceClient mailServiceClient;

    @Transactional
    public PurchaseResponseDTO createPurchase(String userId, PurchaseCreateDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", dto.getProductId()));

        BigDecimal totalPrice = dto.getUnitPrice().multiply(BigDecimal.valueOf(dto.getQuantity()));

        Purchase purchase = Purchase.builder()
                .user(user)
                .product(product)
                .quantity(dto.getQuantity())
                .unitPrice(dto.getUnitPrice())
                .totalPrice(totalPrice)
                .orderStatus(OrderStatus.PENDING)
                .paymentMethod(dto.getPaymentMethod())
                .paymentStatus(PaymentStatus.PENDING)
                .shippingAddress(dto.getShippingAddress())
                .notes(dto.getNotes())
                .purchasedAt(LocalDateTime.now())
                .build();

        Purchase savedPurchase = purchaseRepository.save(purchase);
        PurchaseResponseDTO responseDTO = mapToResponseDTO(savedPurchase);
        
        // Send confirmation email asychronously or catch the exception so it doesn't rollback
        if (user.getEmail() != null) {
            mailServiceClient.sendOrderConfirmationMail(user.getEmail(), responseDTO);
        }

        return responseDTO;
    }

    @Transactional(readOnly = true)
    public PurchaseResponseDTO getPurchaseById(String currentUserId, Long purchaseId) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", purchaseId));

        // KRİTİK KONTROL BURASI:
        // Eğer verinin sahibi (!=) şu anki kullanıcı değilse HATA VER.
        if (!purchase.getUser().getId().equals(currentUserId)) {
            // Loglama yapabilirsin: "Kullanıcı X, Y kullanıcısının verisine erişmeye çalıştı!"
            throw new UnauthorizedAccessException("Bu siparişi görüntüleme yetkiniz yok.");
        }

        return mapToResponseDTO(purchase);
    }

    @Transactional(readOnly = true)
    public PurchaseDetailDTO getPurchaseDetailById(Long id) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", id));
        return mapToDetailDTO(purchase);
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getAllPurchases() {
        return purchaseRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getPurchasesByUserId(String userId) {
        return purchaseRepository.findByUserId(userId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getRecentPurchasesByUserId(String userId) {
        return purchaseRepository.findRecentPurchasesByUserId(userId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getPurchasesByOrderStatus(OrderStatus orderStatus) {
        return purchaseRepository.findByOrderStatus(orderStatus).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getPurchasesByUserIdAndStatus(String userId, OrderStatus orderStatus) {
        return purchaseRepository.findByUserIdAndOrderStatus(userId, orderStatus).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Long getTotalPurchaseCountByUserId(String userId) {
        return purchaseRepository.countPurchasesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Double getTotalSpendingByUserId(String userId) {
        java.math.BigDecimal total = purchaseRepository.getTotalSpendingByUserId(userId);
        return total != null ? total.doubleValue() : 0.0;
    }

    @Transactional
    public PurchaseResponseDTO updatePurchase(Long id, PurchaseUpdateDTO dto) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", id));

        if (dto.getOrderStatus() != null) {
            purchase.setOrderStatus(dto.getOrderStatus());
            if (dto.getOrderStatus() == OrderStatus.DELIVERED) {
                purchase.setDeliveredAt(LocalDateTime.now());
            }
        }
        if (dto.getPaymentStatus() != null) {
            purchase.setPaymentStatus(dto.getPaymentStatus());
        }
        if (dto.getTrackingNumber() != null) {
            purchase.setTrackingNumber(dto.getTrackingNumber());
        }
        if (dto.getNotes() != null) {
            purchase.setNotes(dto.getNotes());
        }

        Purchase updatedPurchase = purchaseRepository.save(purchase);
        return mapToResponseDTO(updatedPurchase);
    }

    @Transactional
    public void deletePurchase(Long id) {
        if (!purchaseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Purchase", "id", id);
        }
        purchaseRepository.deleteById(id);
    }

    private PurchaseResponseDTO mapToResponseDTO(Purchase purchase) {
        return PurchaseResponseDTO.builder()
                .id(purchase.getId())
                .userId(purchase.getUser().getId())
                .userName(purchase.getUser().getName())
                .productId(purchase.getProduct().getId())
                .productName(purchase.getProduct().getName())
                .productBrand(purchase.getProduct().getBrand())
                .quantity(purchase.getQuantity())
                .unitPrice(purchase.getUnitPrice())
                .totalPrice(purchase.getTotalPrice())
                .orderStatus(purchase.getOrderStatus())
                .paymentMethod(purchase.getPaymentMethod())
                .paymentStatus(purchase.getPaymentStatus())
                .shippingAddress(purchase.getShippingAddress())
                .trackingNumber(purchase.getTrackingNumber())
                .notes(purchase.getNotes())
                .purchasedAt(purchase.getPurchasedAt())
                .deliveredAt(purchase.getDeliveredAt())
                .createdAt(purchase.getCreatedAt())
                .updatedAt(purchase.getUpdatedAt())
                .build();
    }
    private PurchaseDetailDTO mapToDetailDTO(Purchase purchase) {
        return PurchaseDetailDTO.builder()
                .id(purchase.getId())
                .userId(purchase.getUser().getId())
                .userName(purchase.getUser().getName())
                .userEmail(purchase.getUser().getEmail())
                .productId(purchase.getProduct().getId())
                .productName(purchase.getProduct().getName())
                .productBrand(purchase.getProduct().getBrand())
                .productIngredients(purchase.getProduct().getIngredients())
                .productQualityScore(purchase.getProduct().getQualityScore())
                .quantity(purchase.getQuantity())
                .unitPrice(purchase.getUnitPrice())
                .totalPrice(purchase.getTotalPrice())
                .orderStatus(purchase.getOrderStatus())
                .paymentMethod(purchase.getPaymentMethod())
                .paymentStatus(purchase.getPaymentStatus())
                .shippingAddress(purchase.getShippingAddress())
                .trackingNumber(purchase.getTrackingNumber())
                .notes(purchase.getNotes())
                .purchasedAt(purchase.getPurchasedAt())
                .deliveredAt(purchase.getDeliveredAt())
                .createdAt(purchase.getCreatedAt())
                .updatedAt(purchase.getUpdatedAt())
                .build();
    }
}