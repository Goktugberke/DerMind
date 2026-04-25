package com.dermind.DerMind.cart.service;

import com.dermind.DerMind.cart.dto.CartItemAddDTO;
import com.dermind.DerMind.cart.dto.CartItemResponseDTO;
import com.dermind.DerMind.cart.model.CartItem;
import com.dermind.DerMind.cart.repository.CartItemRepository;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public List<CartItemResponseDTO> getCart(String userId) {
        return cartItemRepository.findByUserId(userId).stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CartItemResponseDTO addItem(String userId, Long productId, int quantity) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        Optional<CartItem> existingItem = cartItemRepository.findByUserIdAndProductId(userId, productId);
        CartItem cartItem;
        if (existingItem.isPresent()) {
            cartItem = existingItem.get();
            cartItem.setQuantity(cartItem.getQuantity() + quantity);
        } else {
            cartItem = new CartItem();
            cartItem.setUser(user);
            cartItem.setProduct(product);
            cartItem.setQuantity(quantity);
        }

        return convertToResponseDTO(cartItemRepository.save(cartItem));
    }

    @Transactional
    public CartItemResponseDTO updateQuantity(String userId, Long productId, int quantity) {
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            return null;
        }

        cartItem.setQuantity(quantity);
        return convertToResponseDTO(cartItemRepository.save(cartItem));
    }

    @Transactional
    public void removeItem(String userId, Long productId) {
        cartItemRepository.findByUserIdAndProductId(userId, productId)
                .ifPresent(cartItemRepository::delete);
    }

    @Transactional
    public void clearCart(String userId) {
        List<CartItem> items = cartItemRepository.findByUserId(userId);
        cartItemRepository.deleteAll(items);
    }

    @Transactional
    public List<CartItemResponseDTO> mergeCart(String userId, List<CartItemAddDTO> localItems) {
        for (CartItemAddDTO item : localItems) {
            addItem(userId, item.getProductId(), item.getQuantity());
        }
        return getCart(userId);
    }

    private CartItemResponseDTO convertToResponseDTO(CartItem cartItem) {
        Product p = cartItem.getProduct();
        ProductResponseDTO productDTO = new ProductResponseDTO(
                p.getId(),
                p.getName(),
                p.getBrand(),
                p.getIngredients(),
                p.getQualityScore(),
                p.getBaseScore(),
                p.getPrice(),
                p.getSephoraProductId(),
                p.getCategory(),
                p.getSecondaryCategory(),
                p.getSephoraRating(),
                null // personalScore
        );

        return new CartItemResponseDTO(cartItem.getId(), productDTO, cartItem.getQuantity());
    }
}
