package com.dermind.DerMind.cart.service;

import com.dermind.DerMind.cart.dto.CartItemAddDTO;
import com.dermind.DerMind.cart.dto.CartItemResponseDTO;
import com.dermind.DerMind.cart.model.CartItem;
import com.dermind.DerMind.cart.repository.CartItemRepository;
import com.dermind.DerMind.error.ResourceNotFoundException;
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
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductMapper productMapper;

    @Transactional(readOnly = true)
    public List<CartItemResponseDTO> getCart(String userId) {
        return cartItemRepository.findByUserId(userId).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CartItemResponseDTO addItem(String userId, Long productId, int quantity) {
        if (quantity <= 0 || quantity > 100) {
            throw new IllegalArgumentException("quantity must be between 1 and 100");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        Optional<CartItem> existing = cartItemRepository.findByUserIdAndProductId(userId, productId);
        CartItem item = existing.orElseGet(() -> {
            CartItem ci = new CartItem();
            ci.setUser(user);
            ci.setProduct(product);
            ci.setQuantity(0);
            return ci;
        });
        int newQty = Math.min(item.getQuantity() + quantity, 100);
        item.setQuantity(newQty);
        return toResponseDTO(cartItemRepository.save(item));
    }

    @Transactional
    public CartItemResponseDTO updateQuantity(String userId, Long productId, int quantity) {
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", "productId", productId));

        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            return null;
        }
        if (quantity > 100) {
            throw new IllegalArgumentException("quantity cannot exceed 100");
        }
        cartItem.setQuantity(quantity);
        return toResponseDTO(cartItemRepository.save(cartItem));
    }

    @Transactional
    public void removeItem(String userId, Long productId) {
        cartItemRepository.findByUserIdAndProductId(userId, productId)
                .ifPresent(cartItemRepository::delete);
    }

    @Transactional
    public void clearCart(String userId) {
        cartItemRepository.deleteAll(cartItemRepository.findByUserId(userId));
    }

    @Transactional
    public List<CartItemResponseDTO> mergeCart(String userId, List<CartItemAddDTO> localItems) {
        // Kullanıcıyı bir kez fetch et, döngü içinde tekrar sorgu yapma
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        for (CartItemAddDTO item : localItems) {
            if (item.getQuantity() <= 0 || item.getQuantity() > 100) continue;
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", item.getProductId()));
            CartItem cartItem = cartItemRepository
                    .findByUserIdAndProductId(userId, item.getProductId())
                    .orElseGet(() -> {
                        CartItem ci = new CartItem();
                        ci.setUser(user);
                        ci.setProduct(product);
                        ci.setQuantity(0);
                        return ci;
                    });
            cartItem.setQuantity(Math.min(cartItem.getQuantity() + item.getQuantity(), 100));
            cartItemRepository.save(cartItem);
        }
        return cartItemRepository.findByUserId(userId).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    private CartItemResponseDTO toResponseDTO(CartItem cartItem) {
        ProductResponseDTO productDTO = productMapper.toResponseDTO(cartItem.getProduct());
        return new CartItemResponseDTO(cartItem.getId(), productDTO, cartItem.getQuantity());
    }
}
