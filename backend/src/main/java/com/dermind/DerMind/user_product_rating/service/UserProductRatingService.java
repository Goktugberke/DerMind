package com.dermind.DerMind.user_product_rating.service;

import com.dermind.DerMind.common.enums.PaymentStatus;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.purchase.repository.PurchaseRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.dto.*;
import com.dermind.DerMind.user_product_rating.mapper.RatingMapper;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserProductRatingService {

    private final UserProductRatingRepository ratingRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PurchaseRepository purchaseRepository;
    private final RatingMapper ratingMapper;

    @Transactional
    public RatingResponseDTO createRating(RatingCreateDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", dto.getUserId()));
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", dto.getProductId()));

        if (ratingRepository.findByUserIdAndProductId(dto.getUserId(), dto.getProductId()).isPresent()) {
            throw new BusinessException("Bu ürünü zaten puanladınız.");
        }

        boolean verifiedPurchase = purchaseRepository.findByUserId(dto.getUserId()).stream()
                .anyMatch(p -> p.getProduct().getId().equals(dto.getProductId())
                        && PaymentStatus.COMPLETED == p.getPaymentStatus());

        UserProductRating rating = UserProductRating.builder()
                .user(user)
                .product(product)
                .rating(dto.getRating())
                .review(dto.getReview())
                .skinImprovement(dto.getSkinImprovement())
                .wouldRecommend(dto.getWouldRecommend())
                .usageDuration(dto.getUsageDuration())
                .usageDurationUnit(dto.getUsageDurationUnit())
                .pros(dto.getPros())
                .cons(dto.getCons())
                .verifiedPurchase(verifiedPurchase)
                .build();

        return ratingMapper.toResponseDTO(ratingRepository.save(rating));
    }

    @Transactional(readOnly = true)
    public RatingResponseDTO getRatingById(Long id) {
        return ratingRepository.findById(id)
                .map(ratingMapper::toResponseDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", id));
    }

    @Transactional(readOnly = true)
    public List<RatingResponseDTO> getAllRatings() {
        return ratingRepository.findAll().stream()
                .map(ratingMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RatingResponseDTO> getRatingsByUserId(String userId) {
        return ratingRepository.findByUserId(userId).stream()
                .map(ratingMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RatingResponseDTO> getRatingsByProductId(Long productId) {
        return ratingRepository.findByProductId(productId).stream()
                .map(ratingMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RatingResponseDTO> getRecentRatingsByProductId(Long productId) {
        return ratingRepository.findRecentRatingsByProductId(productId).stream()
                .limit(10)
                .map(ratingMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RatingResponseDTO> getVerifiedRatingsByProductId(Long productId) {
        return ratingRepository.findVerifiedRatingsByProductId(productId).stream()
                .map(ratingMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductRatingStatsDTO getProductRatingStats(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        List<UserProductRating> ratings = ratingRepository.findByProductId(productId);

        return ProductRatingStatsDTO.builder()
                .productId(productId)
                .productName(product.getName())
                .totalRatings((long) ratings.size())
                .averageRating(ratingRepository.getAverageRatingByProductId(productId))
                .averagePersonalizedRating(ratingRepository.getAveragePersonalizedRatingByProductId(productId))
                .recommendCount(ratingRepository.getRecommendCountByProductId(productId))
                .skinImprovementCount(ratingRepository.getSkinImprovementCountByProductId(productId))
                .verifiedPurchaseCount(ratings.stream().filter(UserProductRating::getVerifiedPurchase).count())
                .build();
    }

    @Transactional
    public RatingResponseDTO updateRating(Long id, RatingUpdateDTO dto) {
        UserProductRating rating = ratingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", id));

        if (dto.getRating() != null) rating.setRating(dto.getRating());
        if (dto.getReview() != null) rating.setReview(dto.getReview());
        if (dto.getSkinImprovement() != null) rating.setSkinImprovement(dto.getSkinImprovement());
        if (dto.getWouldRecommend() != null) rating.setWouldRecommend(dto.getWouldRecommend());
        if (dto.getUsageDuration() != null) rating.setUsageDuration(dto.getUsageDuration());
        if (dto.getUsageDurationUnit() != null) rating.setUsageDurationUnit(dto.getUsageDurationUnit());
        if (dto.getPros() != null) rating.setPros(dto.getPros());
        if (dto.getCons() != null) rating.setCons(dto.getCons());

        return ratingMapper.toResponseDTO(ratingRepository.save(rating));
    }

    @Transactional
    public void deleteRating(Long id) {
        if (!ratingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Rating", "id", id);
        }
        ratingRepository.deleteById(id);
    }
}
