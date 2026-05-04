package com.dermind.DerMind.user_product_rating.service;

import com.dermind.DerMind.common.enums.PaymentStatus;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.purchase.model.Purchase;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.dto.ProductRatingStatsDTO;
import com.dermind.DerMind.user_product_rating.dto.RatingCreateDTO;
import com.dermind.DerMind.user_product_rating.dto.RatingResponseDTO;
import com.dermind.DerMind.user_product_rating.dto.RatingUpdateDTO;
import com.dermind.DerMind.user_product_rating.mapper.RatingMapper;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class UserProductRatingServiceTest {

    @Mock UserProductRatingRepository ratingRepository;
    @Mock UserRepository userRepository;
    @Mock ProductRepository productRepository;
    @Mock PurchaseRepository purchaseRepository;
    @Mock RatingMapper ratingMapper;

    @InjectMocks UserProductRatingService ratingService;

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
        return p;
    }

    private UserProductRating makeRating(Long id, User user, Product product) {
        return UserProductRating.builder()
                .id(id)
                .user(user)
                .product(product)
                .rating(8)
                .verifiedPurchase(false)
                .build();
    }

    private RatingResponseDTO makeResponseDTO(Long id) {
        return RatingResponseDTO.builder().id(id).userId("u1").productId(1L).rating(8).build();
    }

    // ── createRating ────────────────────────────────────────────────────

    @Test
    @DisplayName("createRating: kullanıcı yoksa ResourceNotFoundException")
    void createRating_userNotFound_throws() {
        RatingCreateDTO dto = RatingCreateDTO.builder().userId("missing").productId(1L).rating(8).build();
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ratingService.createRating(dto))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(ratingRepository, never()).save(any());
    }

    @Test
    @DisplayName("createRating: ürün yoksa ResourceNotFoundException")
    void createRating_productNotFound_throws() {
        RatingCreateDTO dto = RatingCreateDTO.builder().userId("u1").productId(99L).rating(8).build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(makeUser("u1")));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ratingService.createRating(dto))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createRating: aynı kullanıcı+ürün için duplicate → BusinessException")
    void createRating_duplicate_throws() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        RatingCreateDTO dto = RatingCreateDTO.builder().userId("u1").productId(1L).rating(8).build();

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(ratingRepository.findByUserIdAndProductId("u1", 1L))
                .thenReturn(Optional.of(makeRating(10L, user, product)));

        assertThatThrownBy(() -> ratingService.createRating(dto))
                .isInstanceOf(BusinessException.class);
        verify(ratingRepository, never()).save(any());
    }

    @Test
    @DisplayName("createRating: completed satın alım varsa verifiedPurchase=true")
    void createRating_withCompletedPurchase_setsVerifiedTrue() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        RatingCreateDTO dto = RatingCreateDTO.builder().userId("u1").productId(1L).rating(8).build();

        Purchase purchase = Purchase.builder()
                .product(product)
                .paymentStatus(PaymentStatus.COMPLETED)
                .build();

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(ratingRepository.findByUserIdAndProductId("u1", 1L)).thenReturn(Optional.empty());
        when(purchaseRepository.findByUserId("u1")).thenReturn(List.of(purchase));
        when(ratingRepository.save(any(UserProductRating.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(ratingMapper.toResponseDTO(any())).thenReturn(makeResponseDTO(1L));

        ratingService.createRating(dto);

        verify(ratingRepository).save(argThat(r -> r.getVerifiedPurchase()));
    }

    @Test
    @DisplayName("createRating: satın alım yoksa verifiedPurchase=false")
    void createRating_noPurchase_verifiedFalse() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        RatingCreateDTO dto = RatingCreateDTO.builder().userId("u1").productId(1L).rating(5).build();

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(ratingRepository.findByUserIdAndProductId("u1", 1L)).thenReturn(Optional.empty());
        when(purchaseRepository.findByUserId("u1")).thenReturn(List.of());
        when(ratingRepository.save(any(UserProductRating.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(ratingMapper.toResponseDTO(any())).thenReturn(makeResponseDTO(2L));

        ratingService.createRating(dto);

        verify(ratingRepository).save(argThat(r -> !r.getVerifiedPurchase()));
    }

    // ── getProductRatingStats ────────────────────────────────────────────

    @Test
    @DisplayName("getProductRatingStats: ürün yoksa ResourceNotFoundException")
    void getProductRatingStats_productNotFound_throws() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> ratingService.getProductRatingStats(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getProductRatingStats: aggregate değerleri doğru set edilir")
    void getProductRatingStats_aggregatesSet() {
        Product product = makeProduct(1L);
        User user = makeUser("u1");
        UserProductRating r1 = makeRating(1L, user, product);
        r1.setVerifiedPurchase(true);
        UserProductRating r2 = makeRating(2L, user, product);

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(ratingRepository.findByProductId(1L)).thenReturn(List.of(r1, r2));
        when(ratingRepository.getAverageRatingByProductId(1L)).thenReturn(7.5);
        when(ratingRepository.getAveragePersonalizedRatingByProductId(1L)).thenReturn(8.0);
        when(ratingRepository.getRecommendCountByProductId(1L)).thenReturn(1L);
        when(ratingRepository.getSkinImprovementCountByProductId(1L)).thenReturn(2L);

        ProductRatingStatsDTO stats = ratingService.getProductRatingStats(1L);

        assertThat(stats.getProductId()).isEqualTo(1L);
        assertThat(stats.getTotalRatings()).isEqualTo(2L);
        assertThat(stats.getAverageRating()).isEqualTo(7.5);
        assertThat(stats.getVerifiedPurchaseCount()).isEqualTo(1L);
    }

    // ── getRatingById ─────────────────────────────────────────────────

    @Test
    @DisplayName("getRatingById: bulunamazsa ResourceNotFoundException")
    void getRatingById_notFound_throws() {
        when(ratingRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> ratingService.getRatingById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updateRating ─────────────────────────────────────────────────

    @Test
    @DisplayName("updateRating: bulunamazsa ResourceNotFoundException")
    void updateRating_notFound_throws() {
        when(ratingRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> ratingService.updateRating(99L, new RatingUpdateDTO()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(ratingRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateRating: alanlar güncellenir ve save edilir")
    void updateRating_updatesFields() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        UserProductRating rating = makeRating(5L, user, product);
        RatingUpdateDTO dto = new RatingUpdateDTO();
        dto.setRating(9);
        dto.setReview("Great!");

        when(ratingRepository.findById(5L)).thenReturn(Optional.of(rating));
        when(ratingRepository.save(rating)).thenReturn(rating);
        when(ratingMapper.toResponseDTO(rating)).thenReturn(makeResponseDTO(5L));

        ratingService.updateRating(5L, dto);

        assertThat(rating.getRating()).isEqualTo(9);
        assertThat(rating.getReview()).isEqualTo("Great!");
        verify(ratingRepository).save(rating);
    }

    // ── deleteRating ──────────────────────────────────────────────────

    @Test
    @DisplayName("deleteRating: bulunamazsa ResourceNotFoundException")
    void deleteRating_notFound_throws() {
        when(ratingRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> ratingService.deleteRating(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(ratingRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteRating: mevcut rating silinir")
    void deleteRating_exists_deletes() {
        when(ratingRepository.existsById(5L)).thenReturn(true);
        ratingService.deleteRating(5L);
        verify(ratingRepository).deleteById(5L);
    }
}
