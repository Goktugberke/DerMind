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
class FavoriteServiceTest {

    @Mock FavoriteRepository favoriteRepository;
    @Mock UserRepository userRepository;
    @Mock ProductRepository productRepository;
    @Mock ProductMapper productMapper;

    @InjectMocks FavoriteService favoriteService;

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

    private ProductResponseDTO makeProductDTO(Long id) {
        return new ProductResponseDTO(id, "Product " + id, null, null, null, null, null, null, null, null, null, null);
    }

    private Favorite makeFavorite(Long id, User user, Product product) {
        Favorite f = new Favorite();
        f.setId(id);
        f.setUser(user);
        f.setProduct(product);
        return f;
    }

    // ── addFavorite ───────────────────────────────────────────────────────

    @Test
    @DisplayName("addFavorite: kullanıcı bulunamazsa ResourceNotFoundException")
    void addFavorite_userNotFound_throws() {
        when(userRepository.findById("uid-x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> favoriteService.addFavorite("uid-x", 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(favoriteRepository, never()).save(any());
    }

    @Test
    @DisplayName("addFavorite: ürün bulunamazsa ResourceNotFoundException")
    void addFavorite_productNotFound_throws() {
        when(userRepository.findById("uid-1")).thenReturn(Optional.of(makeUser("uid-1")));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> favoriteService.addFavorite("uid-1", 99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(favoriteRepository, never()).save(any());
    }

    @Test
    @DisplayName("addFavorite: aynı ürün ikinci kez eklenince BusinessException")
    void addFavorite_duplicate_throws() {
        when(userRepository.findById("uid-1")).thenReturn(Optional.of(makeUser("uid-1")));
        when(productRepository.findById(1L)).thenReturn(Optional.of(makeProduct(1L)));
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 1L)).thenReturn(true);

        assertThatThrownBy(() -> favoriteService.addFavorite("uid-1", 1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already in favorites");
        verify(favoriteRepository, never()).save(any());
    }

    @Test
    @DisplayName("addFavorite: yeni favori başarıyla kaydedilir")
    void addFavorite_valid_savesAndReturnsDTO() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        Favorite saved = makeFavorite(10L, user, product);

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 1L)).thenReturn(false);
        when(favoriteRepository.save(any(Favorite.class))).thenReturn(saved);
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(1L));

        FavoriteResponseDTO result = favoriteService.addFavorite("uid-1", 1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(10L);
        verify(favoriteRepository).save(any(Favorite.class));
    }

    @Test
    @DisplayName("addFavorite: silindikten sonra tekrar eklenebilir")
    void addFavorite_afterRemoval_canBeAddedAgain() {
        User user = makeUser("uid-1");
        Product product = makeProduct(1L);
        Favorite saved = makeFavorite(11L, user, product);

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 1L)).thenReturn(false);
        when(favoriteRepository.save(any(Favorite.class))).thenReturn(saved);
        when(productMapper.toResponseDTO(product)).thenReturn(makeProductDTO(1L));

        FavoriteResponseDTO result = favoriteService.addFavorite("uid-1", 1L);

        assertThat(result.getId()).isEqualTo(11L);
    }

    // ── removeFavorite ────────────────────────────────────────────────────

    @Test
    @DisplayName("removeFavorite: var olmayan favori → ResourceNotFoundException")
    void removeFavorite_notFound_throws() {
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 1L)).thenReturn(false);
        assertThatThrownBy(() -> favoriteService.removeFavorite("uid-1", 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(favoriteRepository, never()).deleteByUserIdAndProductId(any(), any());
    }

    @Test
    @DisplayName("removeFavorite: mevcut favori silinir")
    void removeFavorite_exists_deletes() {
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 1L)).thenReturn(true);

        favoriteService.removeFavorite("uid-1", 1L);

        verify(favoriteRepository).deleteByUserIdAndProductId("uid-1", 1L);
    }

    // ── getMyFavorites ────────────────────────────────────────────────────

    @Test
    @DisplayName("getMyFavorites: boş liste döner")
    void getMyFavorites_empty_returnsEmptyList() {
        when(favoriteRepository.findByUserId("uid-1")).thenReturn(List.of());
        assertThat(favoriteService.getMyFavorites("uid-1")).isEmpty();
    }

    @Test
    @DisplayName("getMyFavorites: favoriler DTO'ya map edilir")
    void getMyFavorites_withItems_mapsToDTO() {
        User user = makeUser("uid-1");
        Product p1 = makeProduct(1L);
        Product p2 = makeProduct(2L);
        Favorite f1 = makeFavorite(1L, user, p1);
        Favorite f2 = makeFavorite(2L, user, p2);

        when(favoriteRepository.findByUserId("uid-1")).thenReturn(List.of(f1, f2));
        when(productMapper.toResponseDTO(p1)).thenReturn(makeProductDTO(1L));
        when(productMapper.toResponseDTO(p2)).thenReturn(makeProductDTO(2L));

        List<FavoriteResponseDTO> result = favoriteService.getMyFavorites("uid-1");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(FavoriteResponseDTO::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    // ── checkIsFavorite ───────────────────────────────────────────────────

    @Test
    @DisplayName("checkIsFavorite: favoride olan ürün → true")
    void checkIsFavorite_exists_returnsTrue() {
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 1L)).thenReturn(true);
        assertThat(favoriteService.checkIsFavorite("uid-1", 1L)).isTrue();
    }

    @Test
    @DisplayName("checkIsFavorite: favoride olmayan ürün → false")
    void checkIsFavorite_notExists_returnsFalse() {
        when(favoriteRepository.existsByUserIdAndProductId("uid-1", 99L)).thenReturn(false);
        assertThat(favoriteService.checkIsFavorite("uid-1", 99L)).isFalse();
    }

    @Test
    @DisplayName("checkIsFavorite: ürün varsa ama favoride değilse false")
    void checkIsFavorite_productExistsButNotFavorited_returnsFalse() {
        when(favoriteRepository.existsByUserIdAndProductId("uid-2", 1L)).thenReturn(false);
        assertThat(favoriteService.checkIsFavorite("uid-2", 1L)).isFalse();
    }
}
