package com.dermind.DerMind.purchase.service;

import com.dermind.DerMind.common.enums.OrderStatus;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.purchase.dto.*;
import com.dermind.DerMind.purchase.mapper.PurchaseMapper;
import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.mail.service.MailServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final PurchaseMapper purchaseMapper;
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
                .paymentStatus(com.dermind.DerMind.common.enums.PaymentStatus.PENDING)
                .shippingAddress(dto.getShippingAddress())
                .notes(dto.getNotes())
                .purchasedAt(LocalDateTime.now())
                .build();

        PurchaseResponseDTO response = purchaseMapper.toResponseDTO(purchaseRepository.save(purchase));

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            mailServiceClient.sendOrderConfirmationMail(user.getEmail(), response);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public PurchaseResponseDTO getPurchaseById(String currentUserId, Long purchaseId) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", purchaseId));
        if (!purchase.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedAccessException("Bu siparişi görüntüleme yetkiniz yok.");
        }
        return purchaseMapper.toResponseDTO(purchase);
    }

    @Transactional(readOnly = true)
    public PurchaseDetailDTO getPurchaseDetailById(String currentUserId, Long id) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", id));
        if (!purchase.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedAccessException("Bu siparişi görüntüleme yetkiniz yok.");
        }
        return purchaseMapper.toDetailDTO(purchase);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<PurchaseResponseDTO> getAllPurchases() {
        return purchaseRepository.findAll().stream()
                .map(purchaseMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getPurchasesByUserId(String userId) {
        return purchaseRepository.findByUserId(userId).stream()
                .map(purchaseMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getRecentPurchasesByUserId(String userId) {
        return purchaseRepository.findRecentPurchasesByUserId(userId).stream()
                .map(purchaseMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<PurchaseResponseDTO> getPurchasesByOrderStatus(OrderStatus orderStatus) {
        return purchaseRepository.findByOrderStatus(orderStatus).stream()
                .map(purchaseMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponseDTO> getPurchasesByUserIdAndStatus(String userId, OrderStatus orderStatus) {
        return purchaseRepository.findByUserIdAndOrderStatus(userId, orderStatus).stream()
                .map(purchaseMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Long getTotalPurchaseCountByUserId(String userId) {
        return purchaseRepository.countPurchasesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Double getTotalSpendingByUserId(String userId) {
        BigDecimal total = purchaseRepository.getTotalSpendingByUserId(userId);
        return total != null ? total.doubleValue() : 0.0;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PurchaseResponseDTO updatePurchase(Long id, PurchaseUpdateDTO dto) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", id));

        if (dto.getOrderStatus() != null) {
            purchase.setOrderStatus(dto.getOrderStatus());
            if (dto.getOrderStatus() == OrderStatus.DELIVERED) {
                purchase.setDeliveredAt(LocalDateTime.now());
            }
        }
        if (dto.getPaymentStatus() != null)
            purchase.setPaymentStatus(dto.getPaymentStatus());
        if (dto.getTrackingNumber() != null)
            purchase.setTrackingNumber(dto.getTrackingNumber());
        if (dto.getNotes() != null)
            purchase.setNotes(dto.getNotes());

        return purchaseMapper.toResponseDTO(purchaseRepository.save(purchase));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deletePurchase(Long id) {
        if (!purchaseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Purchase", "id", id);
        }
        purchaseRepository.deleteById(id);
    }
}
