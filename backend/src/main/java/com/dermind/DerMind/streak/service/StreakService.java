package com.dermind.DerMind.streak.service;

import com.dermind.DerMind.common.enums.UsageFrequency;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.streak.dto.*;
import com.dermind.DerMind.streak.model.Streak;
import com.dermind.DerMind.streak.repository.StreakRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StreakService {

    private final StreakRepository streakRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional
    public StreakResponseDTO createStreak(String userId, StreakCreateDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + dto.getProductId()));

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

        Streak savedStreak = streakRepository.save(streak);
        return mapToResponseDTO(savedStreak);
    }

    @Transactional(readOnly = true)
    public StreakResponseDTO getStreakById(Long id) {
        Streak streak = streakRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Streak not found with id: " + id));
        return mapToResponseDTO(streak);
    }

    @Transactional
    public List<StreakResponseDTO> getStreaksByUserId(String userId) {
        // Fetch streaks
        List<Streak> streaks = streakRepository.findByUserId(userId);
        return processAndMapStreaks(streaks);
    }

    @Transactional
    public List<StreakResponseDTO> getActiveStreaksByUserId(String userId) {
        List<Streak> streaks = streakRepository.findActiveStreaksByUser(userId);
        return processAndMapStreaks(streaks);
    }

    @Transactional
    public List<StreakResponseDTO> getTopStreaksByUserId(String userId) {
        List<Streak> streaks = streakRepository.findTopStreaksByUserId(userId);
        return processAndMapStreaks(streaks);
    }

    @Transactional
    public List<StreakResponseDTO> getAllStreaks() {
        List<Streak> streaks = streakRepository.findAll();
        return processAndMapStreaks(streaks);
    }

    private List<StreakResponseDTO> processAndMapStreaks(List<Streak> streaks) {
        // Lazy Reset: Check and reset streaks if missed
        boolean needsSave = false;
        for (Streak streak : streaks) {
            if (checkAndResetStreak(streak)) {
                needsSave = true;
            }
        }
        if (needsSave) {
            streakRepository.saveAll(streaks);
        }

        return streaks.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public StreakResponseDTO updateStreak(Long id, StreakUpdateDTO dto) {
        Streak streak = streakRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Streak not found with id: " + id));

        if (dto.getUsageFrequency() != null) {
            streak.setUsageFrequency(dto.getUsageFrequency());
        }
        if (dto.getCustomTimes() != null) {
            streak.setCustomTimes(dto.getCustomTimes());
        }
        if (dto.getDaysOfWeek() != null) {
            streak.setDaysOfWeek(dto.getDaysOfWeek());
        }
        if (dto.getIsActive() != null) {
            streak.setIsActive(dto.getIsActive());
        }

        // Check reset on update too
        checkAndResetStreak(streak);

        Streak updatedStreak = streakRepository.save(streak);
        return mapToResponseDTO(updatedStreak);
    }

    @Transactional
    public StreakResponseDTO recordUsage(Long streakId) {
        Streak streak = streakRepository.findById(streakId)
                .orElseThrow(() -> new RuntimeException("Streak not found with id: " + streakId));

        LocalDate today = LocalDate.now();

        // 1. Check/Reset broken streaks first
        checkAndResetStreak(streak);

        // 2. Increment Usage Counter
        streak.setDailyUsageCounter(streak.getDailyUsageCounter() + 1);

        // 3. Check if target reached for Streak Increment
        // DAILY -> 1, TWICE_DAILY -> 2
        int targetUses = (streak.getUsageFrequency() == UsageFrequency.TWICE_DAILY) ? 2 : 1;

        if (streak.getDailyUsageCounter() >= targetUses) {
            boolean isFirstCompletionToday = (streak.getLastCompletedDate() == null
                    || !streak.getLastCompletedDate().isEqual(today));

            if (isFirstCompletionToday) {
                // Target reached and first time completing today -> Increment Streak
                streak.setCurrentStreak(streak.getCurrentStreak() + 1);
                if (streak.getCurrentStreak() > streak.getLongestStreak()) {
                    streak.setLongestStreak(streak.getCurrentStreak());
                }
                streak.setLastCompletedDate(today);
            }
        }

        streak.setLastUsedDate(today);
        streak.setTotalUses(streak.getTotalUses() + 1);

        Streak savedStreak = streakRepository.save(streak);
        return mapToResponseDTO(savedStreak);
    }

    @Transactional
    public void deleteStreak(Long id) {
        if (!streakRepository.existsById(id)) {
            throw new RuntimeException("Streak not found with id: " + id);
        }
        streakRepository.deleteById(id);
    }

    // ============== HELPER METHODS ==============

    /**
     * Checks if the streak is broken based on frequency and resets if necessary.
     * Returns true if a reset occurred.
     */
    private boolean checkAndResetStreak(Streak streak) {
        if (streak.getLastCompletedDate() == null) {
            // Never completed, if streak > 0, reset it
            if (streak.getCurrentStreak() > 0) {
                streak.setCurrentStreak(0);
                return true;
            }
            return false;
        }

        LocalDate today = LocalDate.now();
        LocalDate lastCompleted = streak.getLastCompletedDate();

        if (lastCompleted.isEqual(today)) {
            return false; // Already done today
        }

        // Logic for DAILY / TWICE_DAILY
        // Must have completed YESTERDAY (or Today if already done)
        // If lastCompletedDate < yesterday, then streak is broken.
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