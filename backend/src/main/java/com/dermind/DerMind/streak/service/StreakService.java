package com.dermind.DerMind.streak.service;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.error.UnauthorizedAccessException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.streak.dto.*;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.streak.repository.StreakRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreakService {

    private final StreakRepository streakRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional
    public StreakResponseDTO createStreak(String userId, StreakCreateDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", dto.getProductId()));

        if (streakRepository.findByUserIdAndProductId(userId, dto.getProductId()).isPresent()) {
            throw new BusinessException("Bu ürün için seri zaten mevcut");
        }

        Streak streak = Streak.builder()
                .user(user)
                .product(product)
                .usageFrequency(dto.getUsageFrequency())
                .customTimes(dto.getCustomTimes())
                .currentStreak(0)
                .longestStreak(0)
                .totalUses(0)
                .dailyUsageCounter(0)
                .isActive(true)
                .build();

        return mapToResponseDTO(streakRepository.save(streak));
    }

    @Transactional(readOnly = true)
    public StreakResponseDTO getStreakById(Long id) {
        Streak streak = streakRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Streak", "id", id));
        return mapToResponseDTO(streak);
    }

    @Transactional
    public List<StreakResponseDTO> getStreaksByUserId(String userId) {
        return processAndMapStreaks(streakRepository.findByUserId(userId));
    }

    @Transactional
    public List<StreakResponseDTO> getActiveStreaksByUserId(String userId) {
        return processAndMapStreaks(streakRepository.findActiveStreaksByUser(userId));
    }

    @Transactional
    public List<StreakResponseDTO> getTopStreaksByUserId(String userId) {
        return processAndMapStreaks(streakRepository.findTopStreaksByUserId(userId));
    }

    @Transactional
    public List<StreakResponseDTO> getAllStreaks() {
        return processAndMapStreaks(streakRepository.findAll());
    }

    private List<StreakResponseDTO> processAndMapStreaks(List<Streak> streaks) {
        boolean needsSave = false;
        for (Streak streak : streaks) {
            if (checkAndResetStreak(streak)) needsSave = true;
        }
        if (needsSave) streakRepository.saveAll(streaks);
        return streaks.stream().map(this::mapToResponseDTO).collect(Collectors.toList());
    }

    @Transactional
    public StreakResponseDTO updateStreak(Long id, StreakUpdateDTO dto) {
        Streak streak = streakRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Streak", "id", id));
        if (dto.getUsageFrequency() != null) streak.setUsageFrequency(dto.getUsageFrequency());
        checkAndResetStreak(streak);
        return mapToResponseDTO(streakRepository.save(streak));
    }

    /**
     * Optimistic lock retry: çift tap durumunda OptimisticLockingFailureException fırlar,
     * 3 kez 50ms backoff ile yeniden dener (counter doğru artar).
     */
    @Retryable(retryFor = OptimisticLockingFailureException.class,
               maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))
    @Transactional
    public StreakResponseDTO recordUsage(String userId, Long streakId) {
        Streak streak = streakRepository.findById(streakId)
                .orElseThrow(() -> new ResourceNotFoundException("Streak", "id", streakId));
        if (!streak.getUser().getId().equals(userId)) {
            throw new UnauthorizedAccessException("Bu seri size ait değil.");
        }

        LocalDate today = LocalDate.now();
        checkAndResetStreak(streak);
        streak.setDailyUsageCounter(streak.getDailyUsageCounter() + 1);

        int targetUses = (streak.getUsageFrequency() == UsageFrequency.TWICE_DAILY) ? 2 : 1;
        if (streak.getDailyUsageCounter() >= targetUses) {
            boolean firstTodayCompletion = streak.getLastCompletedDate() == null
                    || !streak.getLastCompletedDate().isEqual(today);
            if (firstTodayCompletion) {
                streak.setCurrentStreak(streak.getCurrentStreak() + 1);
                if (streak.getCurrentStreak() > streak.getLongestStreak()) {
                    streak.setLongestStreak(streak.getCurrentStreak());
                }
                streak.setLastCompletedDate(today);
            }
        }
        streak.setLastUsedDate(today);
        streak.setTotalUses(streak.getTotalUses() + 1);
        return mapToResponseDTO(streakRepository.save(streak));
    }

    @Transactional
    public void deleteStreak(Long id) {
        if (!streakRepository.existsById(id)) {
            throw new ResourceNotFoundException("Streak", "id", id);
        }
        streakRepository.deleteById(id);
    }

    private boolean checkAndResetStreak(Streak streak) {
        if (streak.getLastCompletedDate() == null) {
            if (streak.getCurrentStreak() > 0) {
                streak.setCurrentStreak(0);
                return true;
            }
            return false;
        }
        LocalDate today = LocalDate.now();
        LocalDate lastCompleted = streak.getLastCompletedDate();
        if (lastCompleted.isEqual(today)) return false;
        if (lastCompleted.isBefore(today.minusDays(1))) {
            streak.setCurrentStreak(0);
            return true;
        }
        return false;
    }

    private StreakResponseDTO mapToResponseDTO(Streak streak) {
        return StreakResponseDTO.builder()
                .id(streak.getId())
                .userId(streak.getUser().getId())
                .userName(streak.getUser().getName())
                .productId(streak.getProduct().getId())
                .productName(streak.getProduct().getName())
                .productBrand(streak.getProduct().getBrand())
                .currentStreak(streak.getCurrentStreak())
                .longestStreak(streak.getLongestStreak())
                .lastUsedDate(streak.getLastUsedDate())
                .usageFrequency(streak.getUsageFrequency())
                .daysOfWeek(streak.getDaysOfWeek())
                .customTimes(streak.getCustomTimes())
                .dailyUsageCounter(streak.getDailyUsageCounter())
                .totalUses(streak.getTotalUses())
                .isActive(streak.getIsActive())
                .createdAt(streak.getCreatedAt())
                .updatedAt(streak.getUpdatedAt())
                .build();
    }
}
