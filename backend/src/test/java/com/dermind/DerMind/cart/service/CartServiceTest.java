package com.dermind.DerMind.cart.service;

import com.dermind.DerMind.cart.dto.CartItemAddDTO;
import com.dermind.DerMind.cart.dto.CartItemResponseDTO;
import com.dermind.DerMind.cart.model.CartItem;
import com.dermind.DerMind.cart.repository.CartItemRepository;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.mapper.ProductMapper;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.product.repository.ProductRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock CartItemRepository cartItemRepository;
    @Mock ProductRepository productRepository;
    @Mock UserRepository userRepository;
    @Mock ProductMapper productMapper;

    @InjectMocks CartService cartService;

    private User makeUser(String id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    private Product makeProduct(Long id) {
        Product p = new Product();
        p.setId(id);
        p.setName("Product " + id);
        return p;
    }

    private CartItem makeCartItem(Long id, User user, Product product, int qty) {
        CartItem ci = new CartItem();
        ci.setId(id);
        ci.setUser(user);
        ci.setProduct(product);
        ci.setQuantity(qty);
        return ci;
    }

    private ProductResponseDTO makeProductDTO(Long id) {
        return ProductResponseDTO.builder()
                .id(id).name("Product " + id)
                .build();
    }

    // ── getCart ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getCart: boş sepet — boş liste döner")
    void getCart_empty_returnsEmptyList() {
        when(cartItemRepository.findByUserId("uid-1")).thenReturn(List.of());
        assertThat(cartService.getCart("uid-1")).isEmpty();
    }

    @Test
    @DisplayName("getCart: ürünler response DTO'ya map edilir")
    void getCart_withItems_mapsToDTOs() {
        User user = makeUser("uid-1");
        Product product = makeProduct(10L);
        CartItem item = makeCartItem(1L, user, product, 3);

        when(cartItemRepository.findByUserId("uid-1")).thenReturn(List.of(item));
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(10L));

        List<CartItemResponseDTO> result = cartService.getCart("uid-1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getQuantity()).isEqualTo(3);
    }

    // ── addItem ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("addItem: quantity=0 → IllegalArgumentException")
    void addItem_zeroQuantity_throws() {
        assertThatThrownBy(() -> cartService.addItem("uid-1", 1L, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1 and 100");
    }

    @Test
    @DisplayName("addItem: quantity=101 → IllegalArgumentException")
    void addItem_quantityOver100_throws() {
        assertThatThrownBy(() -> cartService.addItem("uid-1", 1L, 101))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("addItem: negatif quantity → IllegalArgumentException")
    void addItem_negativeQuantity_throws() {
        assertThatThrownBy(() -> cartService.addItem("uid-1", 1L, -5))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("addItem: kullanıcı bulunamazsa ResourceNotFoundException")
    void addItem_userNotFound_throws() {
        when(userRepository.findById("uid-x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> cartService.addItem("uid-x", 1L, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("addItem: ürün bulunamazsa ResourceNotFoundException")
    void addItem_productNotFound_throws() {
        when(userRepository.findById("uid-1")).thenReturn(Optional.of(makeUser("uid-1")));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> cartService.addItem("uid-1", 99L, 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("addItem: yeni ürün — quantity doğru set edilir")
    void addItem_newItem_setsQuantity() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem saved = makeCartItem(1L, user, product, 5);

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenReturn(saved);
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(1L));

        CartItemResponseDTO result = cartService.addItem("uid-1", 1L, 5);

        assertThat(result.getQuantity()).isEqualTo(5);
        verify(cartItemRepository).save(any(CartItem.class));
    }

    @Test
    @DisplayName("addItem: mevcut ürüne eklenince quantity toplanır")
    void addItem_existingItem_accumulatesQuantity() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem existing = makeCartItem(1L, user, product, 30);

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(existing));
        when(cartItemRepository.save(existing)).thenReturn(existing);
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(1L));

        cartService.addItem("uid-1", 1L, 20);

        assertThat(existing.getQuantity()).isEqualTo(50);
    }

    @Test
    @DisplayName("addItem: toplam 100'ü geçince 100'de takılır (cap)")
    void addItem_existingItemOverflow_capsAt100() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem existing = makeCartItem(1L, user, product, 80);

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(existing));
        when(cartItemRepository.save(existing)).thenReturn(existing);
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(1L));

        cartService.addItem("uid-1", 1L, 50);

        assertThat(existing.getQuantity()).isEqualTo(100);
    }

    // ── updateQuantity ────────────────────────────────────────────────────

    @Test
    @DisplayName("updateQuantity: item bulunamazsa ResourceNotFoundException")
    void updateQuantity_notFound_throws() {
        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> cartService.updateQuantity("uid-1", 1L, 5))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateQuantity: quantity=0 → item silinir, null döner")
    void updateQuantity_zeroQuantity_deletesItemAndReturnsNull() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem item = makeCartItem(1L, user, product, 5);

        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(item));

        CartItemResponseDTO result = cartService.updateQuantity("uid-1", 1L, 0);

        assertThat(result).isNull();
        verify(cartItemRepository).delete(item);
    }

    @Test
    @DisplayName("updateQuantity: negatif quantity → item silinir")
    void updateQuantity_negativeQuantity_deletesItem() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem item = makeCartItem(1L, user, product, 5);

        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(item));

        cartService.updateQuantity("uid-1", 1L, -1);

        verify(cartItemRepository).delete(item);
    }

    @Test
    @DisplayName("updateQuantity: 101 → IllegalArgumentException")
    void updateQuantity_over100_throws() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem item = makeCartItem(1L, user, product, 5);

        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> cartService.updateQuantity("uid-1", 1L, 101))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("100");
    }

    @Test
    @DisplayName("updateQuantity: geçerli quantity → güncellenir ve kaydedilir")
    void updateQuantity_valid_updatesAndSaves() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem item = makeCartItem(1L, user, product, 3);

        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(item));
        when(cartItemRepository.save(item)).thenReturn(item);
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(1L));

        CartItemResponseDTO result = cartService.updateQuantity("uid-1", 1L, 7);

        assertThat(result).isNotNull();
        assertThat(item.getQuantity()).isEqualTo(7);
        verify(cartItemRepository).save(item);
    }

    // ── removeItem ────────────────────────────────────────────────────────

    @Test
    @DisplayName("removeItem: var olan item silinir")
    void removeItem_existingItem_deletes() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        CartItem item = makeCartItem(1L, user, product, 2);

        when(cartItemRepository.findByUserIdAndProductId("uid-1", 1L)).thenReturn(Optional.of(item));

        cartService.removeItem("uid-1", 1L);

        verify(cartItemRepository).delete(item);
    }

    @Test
    @DisplayName("removeItem: item yoksa sessizce tamamlanır (no-op)")
    void removeItem_notFound_noOp() {
        when(cartItemRepository.findByUserIdAndProductId("uid-1", 99L)).thenReturn(Optional.empty());

        assertThatNoException().isThrownBy(() -> cartService.removeItem("uid-1", 99L));
        verify(cartItemRepository, never()).delete(any());
    }

    // ── clearCart ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("clearCart: tüm itemlar silinir")
    void clearCart_deletesAll() {
        User user = makeUser("uid-1");
        Product p1 = makeProduct(1L);
        Product p2 = makeProduct(2L);
        List<CartItem> items = List.of(
                makeCartItem(1L, user, p1, 1),
                makeCartItem(2L, user, p2, 2)
        );
        when(cartItemRepository.findByUserId("uid-1")).thenReturn(items);

        cartService.clearCart("uid-1");

        verify(cartItemRepository).deleteAll(items);
    }

    @Test
    @DisplayName("clearCart: boş sepette sorun çıkmaz")
    void clearCart_emptyCart_noOp() {
        when(cartItemRepository.findByUserId("uid-1")).thenReturn(List.of());

        assertThatNoException().isThrownBy(() -> cartService.clearCart("uid-1"));
        verify(cartItemRepository).deleteAll(List.of());
    }

    // ── mergeCart ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("mergeCart: her local item addItem ile işlenir, güncel sepet döner")
    void mergeCart_callsAddItemForEach_returnsCurrentCart() {
        User user = makeUser("uid-1");
        Product p1 = makeProduct(1L);
        Product p2 = makeProduct(2L);

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(p1));
        when(productRepository.findById(2L)).thenReturn(Optional.of(p2));
        when(cartItemRepository.findByUserIdAndProductId(eq("uid-1"), anyLong())).thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(inv -> {
            CartItem ci = inv.getArgument(0);
            ci.setId(1L);
            return ci;
        });
        when(productMapper.toResponseDTO(any(Product.class))).thenAnswer(inv ->
                makeProductDTO(((Product) inv.getArgument(0)).getId()));

        CartItem merged1 = makeCartItem(1L, user, p1, 2);
        CartItem merged2 = makeCartItem(2L, user, p2, 1);
        when(cartItemRepository.findByUserId("uid-1")).thenReturn(List.of(merged1, merged2));

        List<CartItemAddDTO> localItems = List.of(
                new CartItemAddDTO(1L, 2),
                new CartItemAddDTO(2L, 1)
        );

        List<CartItemResponseDTO> result = cartService.mergeCart("uid-1", localItems);

        assertThat(result).hasSize(2);
        verify(cartItemRepository, times(2)).save(any(CartItem.class));
    }

    @Test
    @DisplayName("mergeCart: boş liste → sepet değişmez")
    void mergeCart_emptyList_returnsCurrentCart() {
        when(userRepository.findById("uid-1")).thenReturn(Optional.of(makeUser("uid-1")));
        when(cartItemRepository.findByUserId("uid-1")).thenReturn(List.of());

        List<CartItemResponseDTO> result = cartService.mergeCart("uid-1", List.of());

        assertThat(result).isEmpty();
        verify(cartItemRepository, never()).save(any());
    }
}
