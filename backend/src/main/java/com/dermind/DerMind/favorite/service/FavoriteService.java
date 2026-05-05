package com.dermind.DerMind.favorite.service;

import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.favorite.dto.FavoriteResponseDTO;
import com.dermind.DerMind.favorite.model.Favorite;
import com.dermind.DerMind.favorite.repository.FavoriteRepository;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.mapper.ProductMapper;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Transactional
    public FavoriteResponseDTO addFavorite(String userId, Long productId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new BusinessException("Product already in favorites");
        }

        Favorite favorite = new Favorite();
        favorite.setUser(user);
        favorite.setProduct(product);
        return toDto(favoriteRepository.save(favorite));
    }

    @Transactional
    public void removeFavorite(String userId, Long productId) {
        if (!favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new ResourceNotFoundException("Favorite", "productId", productId);
        }
        favoriteRepository.deleteByUserIdAndProductId(userId, productId);
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponseDTO> getMyFavorites(String userId) {
        return favoriteRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean checkIsFavorite(String userId, Long productId) {
        return favoriteRepository.existsByUserIdAndProductId(userId, productId);
    }

    private FavoriteResponseDTO toDto(Favorite favorite) {
        ProductResponseDTO productDto = productMapper.toResponseDTO(favorite.getProduct());
        return FavoriteResponseDTO.builder()
                .id(favorite.getId())
                .product(productDto)
                .createdAt(favorite.getCreatedAt())
                .build();
    }
}
