package com.dermind.DerMind.favorite.service;

import com.dermind.DerMind.error.UserNotAuthenticatedException;
import com.dermind.DerMind.favorite.dto.FavoriteResponseDTO;
import com.dermind.DerMind.favorite.model.Favorite;
import com.dermind.DerMind.favorite.repository.FavoriteRepository;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
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

    @Transactional
    public FavoriteResponseDTO addFavorite(String userId, Long productId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotAuthenticatedException("User not found"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + productId));

        if (favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new RuntimeException("Product already in favorites");
        }

        Favorite favorite = new Favorite();
        favorite.setUser(user);
        favorite.setProduct(product);
        
        Favorite savedFavorite = favoriteRepository.save(favorite);
        return convertToDto(savedFavorite);
    }

    @Transactional
    public void removeFavorite(String userId, Long productId) {
        if (!favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new RuntimeException("Favorite not found");
        }
        favoriteRepository.deleteByUserIdAndProductId(userId, productId);
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponseDTO> getMyFavorites(String userId) {
        return favoriteRepository.findByUserId(userId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean checkIsFavorite(String userId, Long productId) {
        return favoriteRepository.existsByUserIdAndProductId(userId, productId);
    }

    private FavoriteResponseDTO convertToDto(Favorite favorite) {
        ProductResponseDTO productDto = new ProductResponseDTO(
                favorite.getProduct().getId(),
                favorite.getProduct().getName(),
                favorite.getProduct().getBrand(),
                favorite.getProduct().getIngredients(),
                favorite.getProduct().getQualityScore(),
                favorite.getProduct().getPrice()
        );


        return FavoriteResponseDTO.builder()
                .id(favorite.getId())
                .product(productDto)
                .createdAt(favorite.getCreatedAt())
                .build();
    }
}
