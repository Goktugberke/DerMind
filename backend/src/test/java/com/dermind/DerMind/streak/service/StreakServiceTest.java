package com.dermind.DerMind.streak.service;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.streak.dto.StreakCreateDTO;
import com.dermind.DerMind.streak.dto.StreakResponseDTO;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.streak.repository.StreakRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StreakServiceTest {

    @Mock StreakRepository streakRepository;
    @Mock UserRepository userRepository;
    @Mock ProductRepository productRepository;

    @InjectMocks StreakService streakService;

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

    private Streak makeStreak(Long id, User user, Product product) {
        return Streak.builder()
                .id(id)
                .user(user)
                .product(product)
                .currentStreak(0)
                .longestStreak(0)
                .totalUses(0)
                .dailyUsageCounter(0)
                .isActive(true)
                .usageFrequency(UsageFrequency.DAILY)
                .build();
    }

    // ── createStreak ────────────────────────────────────────────────────

    @Test
    @DisplayName("createStreak: kullanıcı yoksa ResourceNotFoundException")
    void createStreak_userNotFound_throws() {
        when(userRepository.findById("u1")).thenReturn(Optional.empty());
        StreakCreateDTO dto = StreakCreateDTO.builder()
                .productId(1L).usageFrequency(UsageFrequency.DAILY).build();

        assertThatThrownBy(() -> streakService.createStreak("u1", dto))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createStreak: ürün yoksa ResourceNotFoundException")
    void createStreak_productNotFound_throws() {
        when(userRepository.findById("u1")).thenReturn(Optional.of(makeUser("u1")));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());
        StreakCreateDTO dto = StreakCreateDTO.builder()
                .productId(99L).usageFrequency(UsageFrequency.DAILY).build();

        assertThatThrownBy(() -> streakService.createStreak("u1", dto))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createStreak: aynı kullanıcı+ürün için duplicate → BusinessException")
    void createStreak_duplicate_throws() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(streakRepository.findByUserIdAndProductId("u1", 1L))
                .thenReturn(Optional.of(makeStreak(10L, user, product)));

        StreakCreateDTO dto = StreakCreateDTO.builder()
                .productId(1L).usageFrequency(UsageFrequency.DAILY).build();

        assertThatThrownBy(() -> streakService.createStreak("u1", dto))
                .isInstanceOf(BusinessException.class);
        verify(streakRepository, never()).save(any());
    }

    @Test
    @DisplayName("createStreak: geçerli istek → streak kaydedilir ve DTO döner")
    void createStreak_valid_savesAndReturns() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        Streak saved = makeStreak(10L, user, product);

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(streakRepository.findByUserIdAndProductId("u1", 1L)).thenReturn(Optional.empty());
        when(streakRepository.save(any(Streak.class))).thenReturn(saved);

        StreakCreateDTO dto = StreakCreateDTO.builder()
                .productId(1L).usageFrequency(UsageFrequency.DAILY).build();

        StreakResponseDTO result = streakService.createStreak("u1", dto);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getUserId()).isEqualTo("u1");
        verify(streakRepository).save(any(Streak.class));
    }

    // ── recordUsage ─────────────────────────────────────────────────────

    @Test
    @DisplayName("recordUsage: başka kullanıcının streak'i → UnauthorizedAccessException")
    void recordUsage_wrongUser_throws() {
        User owner = makeUser("owner");
        Product product = makeProduct(1L);
        Streak streak = makeStreak(1L, owner, product);

        when(streakRepository.findById(1L)).thenReturn(Optional.of(streak));

        assertThatThrownBy(() -> streakService.recordUsage("attacker", 1L))
                .isInstanceOf(UnauthorizedAccessException.class);
        verify(streakRepository, never()).save(any());
    }

    @Test
    @DisplayName("recordUsage: streak yoksa ResourceNotFoundException")
    void recordUsage_notFound_throws() {
        when(streakRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> streakService.recordUsage("u1", 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("recordUsage: ONCE_DAILY — 1. kullanımda currentStreak artar, longestStreak güncellenir")
    void recordUsage_onceDaily_firstUse_incrementsStreak() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        Streak streak = makeStreak(1L, user, product);
        streak.setCurrentStreak(3);
        streak.setLongestStreak(3);
        streak.setLastCompletedDate(LocalDate.now().minusDays(1)); // dün tamamlandı

        when(streakRepository.findById(1L)).thenReturn(Optional.of(streak));
        when(streakRepository.save(streak)).thenReturn(streak);

        StreakResponseDTO result = streakService.recordUsage("u1", 1L);

        assertThat(result.getCurrentStreak()).isEqualTo(4);
        assertThat(result.getLongestStreak()).isEqualTo(4);
        assertThat(result.getTotalUses()).isEqualTo(1);
    }

    @Test
    @DisplayName("recordUsage: aynı gün ikinci kayıt — streak sayısı artmaz, totalUses artar")
    void recordUsage_sameDaySecondTime_noExtraStreakIncrement() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        Streak streak = makeStreak(1L, user, product);
        streak.setCurrentStreak(5);
        streak.setLongestStreak(5);
        streak.setLastCompletedDate(LocalDate.now()); // bugün zaten tamamlandı

        when(streakRepository.findById(1L)).thenReturn(Optional.of(streak));
        when(streakRepository.save(streak)).thenReturn(streak);

        StreakResponseDTO result = streakService.recordUsage("u1", 1L);

        // Bugün zaten tamamlandı, currentStreak değişmemeli
        assertThat(result.getCurrentStreak()).isEqualTo(5);
        assertThat(result.getTotalUses()).isEqualTo(1);
    }

    @Test
    @DisplayName("recordUsage: TWICE_DAILY — 1. kullanımda yeterli değil, 2.'de tamamlanır")
    void recordUsage_twiceDaily_secondUseCompletes() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        Streak streak = makeStreak(1L, user, product);
        streak.setUsageFrequency(UsageFrequency.TWICE_DAILY);
        streak.setDailyUsageCounter(1); // ilk kullanım yapıldı
        streak.setLastCompletedDate(LocalDate.now().minusDays(1));

        when(streakRepository.findById(1L)).thenReturn(Optional.of(streak));
        when(streakRepository.save(streak)).thenReturn(streak);

        StreakResponseDTO result = streakService.recordUsage("u1", 1L);

        // Counter 2'ye ulaştı → tamamlandı
        assertThat(result.getCurrentStreak()).isEqualTo(1);
        assertThat(result.getDailyUsageCounter()).isEqualTo(2);
    }

    // ── checkAndResetStreak (gizli mantık, recordUsage üzerinden test edilir) ─

    @Test
    @DisplayName("recordUsage: 2+ gün önce tamamlandı → streak sıfırlanır ve 1 olur")
    void recordUsage_streakExpired_resetsAndStartsNewStreak() {
        User user = makeUser("u1");
        Product product = makeProduct(1L);
        Streak streak = makeStreak(1L, user, product);
        streak.setCurrentStreak(10);
        streak.setLongestStreak(10);
        streak.setLastCompletedDate(LocalDate.now().minusDays(3)); // süresi geçmiş

        when(streakRepository.findById(1L)).thenReturn(Optional.of(streak));
        when(streakRepository.save(streak)).thenReturn(streak);

        StreakResponseDTO result = streakService.recordUsage("u1", 1L);

        assertThat(result.getCurrentStreak()).isEqualTo(1); // sıfırlandı + 1
        assertThat(result.getLongestStreak()).isEqualTo(10); // en uzun değişmez
    }

    // ── deleteStreak ─────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteStreak: bulunamazsa ResourceNotFoundException")
    void deleteStreak_notFound_throws() {
        when(streakRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> streakService.deleteStreak(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(streakRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteStreak: mevcut streak silinir")
    void deleteStreak_exists_deletes() {
        when(streakRepository.existsById(1L)).thenReturn(true);
        streakService.deleteStreak(1L);
        verify(streakRepository).deleteById(1L);
    }
}
