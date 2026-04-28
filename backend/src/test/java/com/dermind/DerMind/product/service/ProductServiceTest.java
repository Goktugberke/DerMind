package com.dermind.DerMind.product.service;

import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.dto.ProductCreateDTO;
import com.dermind.DerMind.product.dto.ProductDetailDTO;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.dto.ProductUpdateDTO;
import com.dermind.DerMind.product.mapper.ProductMapper;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock ProductRepository productRepository;
    @Mock UserRepository userRepository;
    @Mock UserProductRatingRepository ratingRepository;
    @Mock AiServiceClient aiServiceClient;
    @Mock ProductMapper productMapper;

    @InjectMocks ProductService productService;

    @BeforeEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private Product makeProduct(Long id, String name, String sephoraId) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setBrand("TestBrand");
        p.setSephoraProductId(sephoraId);
        p.setQualityScore(7.5);
        return p;
    }

    private ProductDetailDTO emptyDetail(Long id, String name) {
        return new ProductDetailDTO(id, name, "TestBrand", "ing", 7.5, 0.0, 0, 0, null);
    }

    @Test
    @DisplayName("getAllProducts: paginated mapping çalışır")
    void getAllProducts_returnsPage() {
        Product p = makeProduct(1L, "Toner", "P001");
        Page<Product> page = new PageImpl<>(List.of(p));
        when(productRepository.findAll(any(Pageable.class))).thenReturn(page);
        when(productMapper.toResponseDTO(p))
                .thenReturn(new ProductResponseDTO(1L, "Toner", "TestBrand", null, 7.5, null, null, "P001", null, null, null, null));

        Page<ProductResponseDTO> result = productService.getAllProducts(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Toner");
    }

    @Test
    @DisplayName("getProductById: ürün bulunamazsa ResourceNotFoundException")
    void getProductById_notFound_throws() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getProductById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getProductById anonymous: AI çağrısı yok, qualityScore fallback")
    void getProductById_anonymous_fallsBackToQualityScore() {
        Product product = makeProduct(1L, "Toner", "P001");
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productMapper.toDetailDTO(product)).thenReturn(emptyDetail(1L, "Toner"));
        when(productRepository.findProductStats(1L)).thenReturn(Optional.empty());

        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("k", "anonymousUser",
                        List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));

        ProductDetailDTO result = productService.getProductById(1L);

        assertThat(result.getPersonalScore()).isEqualTo(7.5);
        verify(aiServiceClient, never()).getPersonalScore(anyString(), any(), any());
    }

    @Test
    @DisplayName("getProductById authenticated: AI çağrısı yapılır, recommendRate aggregate'ten gelir")
    void getProductById_authenticated_callsAi() {
        Product product = makeProduct(1L, "Toner", "P001");
        User user = new User();
        user.setId("uid-1");
        user.setEmail("user@example.com");

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productMapper.toDetailDTO(product)).thenReturn(emptyDetail(1L, "Toner"));
        when(productRepository.findProductStats(1L)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(ratingRepository.getRecommendRateByProductId(1L)).thenReturn(0.83);
        when(aiServiceClient.getPersonalScore("P001", user, 0.83)).thenReturn(8.7);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user@example.com", null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        ProductDetailDTO result = productService.getProductById(1L);

        assertThat(result.getPersonalScore()).isEqualTo(8.7);
        verify(aiServiceClient).getPersonalScore("P001", user, 0.83);
    }

    @Test
    @DisplayName("getProductById: AI null dönerse qualityScore fallback")
    void getProductById_aiReturnsNull_fallsBack() {
        Product product = makeProduct(1L, "Toner", "P001");
        User user = new User();
        user.setId("uid-1");
        user.setEmail("user@example.com");

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productMapper.toDetailDTO(product)).thenReturn(emptyDetail(1L, "Toner"));
        when(productRepository.findProductStats(1L)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(ratingRepository.getRecommendRateByProductId(1L)).thenReturn(null);
        when(aiServiceClient.getPersonalScore(any(), any(), any())).thenReturn(null);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user@example.com", null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        ProductDetailDTO result = productService.getProductById(1L);
        assertThat(result.getPersonalScore()).isEqualTo(7.5);  // qualityScore fallback
    }

    @Test
    @DisplayName("createProduct: mapper'dan gelen entity persist edilir")
    void createProduct_persistsAndReturns() {
        ProductCreateDTO dto = ProductCreateDTO.builder()
                .name("New").brand("X").ingredients("Y").qualityScore(8.0).build();
        Product entity = makeProduct(null, "New", null);
        Product saved = makeProduct(10L, "New", null);

        when(productMapper.toEntity(dto)).thenReturn(entity);
        when(productRepository.save(entity)).thenReturn(saved);
        when(productMapper.toResponseDTO(saved))
                .thenReturn(new ProductResponseDTO(10L, "New", "X", "Y", 8.0, null, null, null, null, null, null, null));

        ProductResponseDTO result = productService.createProduct(dto);

        assertThat(result.getId()).isEqualTo(10L);
        verify(productRepository).save(entity);
    }

    @Test
    @DisplayName("updateProduct: ürün yoksa ResourceNotFoundException")
    void updateProduct_notFound_throws() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());
        ProductUpdateDTO dto = new ProductUpdateDTO();

        assertThatThrownBy(() -> productService.updateProduct(99L, dto))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateProduct: mapper update + save akışı")
    void updateProduct_callsMapperAndSaves() {
        Product existing = makeProduct(1L, "Old", "P001");
        ProductUpdateDTO dto = new ProductUpdateDTO();
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(productRepository.save(existing)).thenReturn(existing);
        when(productMapper.toResponseDTO(existing))
                .thenReturn(new ProductResponseDTO(1L, "Old", "TestBrand", null, 7.5, null, null, "P001", null, null, null, null));

        productService.updateProduct(1L, dto);

        verify(productMapper).updateEntity(existing, dto);
        verify(productRepository).save(existing);
    }

    @Test
    @DisplayName("deleteProduct: existsById true ise siler")
    void deleteProduct_exists_deletes() {
        when(productRepository.existsById(1L)).thenReturn(true);
        productService.deleteProduct(1L);
        verify(productRepository).deleteById(1L);
    }

    @Test
    @DisplayName("deleteProduct: existsById false ise ResourceNotFoundException")
    void deleteProduct_notFound_throws() {
        when(productRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> productService.deleteProduct(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(productRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("getRecommendationsForUser: allergic kullanıcı için score düşer")
    void getRecommendationsForUser_allergicUser_lowersScore() {
        User user = new User();
        user.setId("uid-1");
        user.setAllergens("paraben,fragrance");

        Product safe = makeProduct(1L, "Clean Product", "P001");
        safe.setIngredients("water, glycerin");
        Product unsafe = makeProduct(2L, "Bad Product", "P002");
        unsafe.setIngredients("water, paraben");

        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(productRepository.findAll()).thenReturn(List.of(safe, unsafe));

        var result = productService.getRecommendationsForUser("uid-1");

        // Match score'a göre sıralı: safe > unsafe
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Clean Product");
        assertThat(result.get(1).getName()).isEqualTo("Bad Product");
        assertThat(result.get(1).getRecommendation()).isEqualTo("Not Recommended");
    }

    @Test
    @DisplayName("getRecommendationsForUser: user yoksa ResourceNotFoundException")
    void getRecommendationsForUser_userNotFound_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> productService.getRecommendationsForUser("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getTopQualityProducts: limit 100'e clamp edilir")
    void getTopQualityProducts_clampsLimit() {
        Page<Product> page = new PageImpl<>(List.of());
        when(productRepository.findTopQualityProducts(any(Pageable.class))).thenReturn(page);

        productService.getTopQualityProducts(500);

        verify(productRepository).findTopQualityProducts(eq(Pageable.ofSize(100)));
    }

    @Test
    @DisplayName("searchProducts: repository'ye delegasyon")
    void searchProducts_delegatesToRepo() {
        Page<Product> page = new PageImpl<>(List.of());
        when(productRepository.searchProducts(eq("toner"), any(Pageable.class))).thenReturn(page);

        productService.searchProducts("toner", PageRequest.of(0, 10));

        verify(productRepository).searchProducts(eq("toner"), any(Pageable.class));
    }

    @Test
    @DisplayName("filterProducts: tüm parametreler repository'ye iletilir")
    void filterProducts_passesAllParams() {
        Page<Product> page = new PageImpl<>(List.of());
        when(productRepository.filterProducts(eq("q"), eq(10.0), eq(50.0), eq(7.0), any(Pageable.class)))
                .thenReturn(page);

        productService.filterProducts("q", 10.0, 50.0, 7.0, PageRequest.of(0, 20));

        verify(productRepository).filterProducts(eq("q"), eq(10.0), eq(50.0), eq(7.0), any(Pageable.class));
    }
}
