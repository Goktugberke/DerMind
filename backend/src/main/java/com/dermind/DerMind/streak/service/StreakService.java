package com.dermind.DerMind.streak.service;

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
    public StreakResponseDTO createStreak(StreakCreateDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + dto.getUserId()));

        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + dto.getProductId()));

        // Aynı kullanıcı ve ürün için seri zaten var mı kontrol et
        if (streakRepository.findByUserIdAndProductId(dto.getUserId(), dto.getProductId()).isPresent()) {
            throw new RuntimeException("Streak already exists for this user and product");
        }

        Streak streak = Streak.builder()
                .user(user)
                .product(product)
                .usageFrequency(dto.getUsageFrequency())
                .usageTime(dto.getUsageTime())
                .currentStreak(0)
                .longestStreak(0)
                .totalUses(0)
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

    @Transactional(readOnly = true)
    public List<StreakResponseDTO> getAllStreaks() {
        return streakRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StreakResponseDTO> getStreaksByUserId(String userId) {
        return streakRepository.findByUserId(userId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StreakResponseDTO> getActiveStreaksByUserId(String userId) {
        return streakRepository.findByUserIdAndIsActive(userId, true).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StreakResponseDTO> getTopStreaksByUserId(String userId) {
        return streakRepository.findTopStreaksByUserId(userId).stream()
                .limit(10)
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
        if (dto.getUsageTime() != null) {
            streak.setUsageTime(dto.getUsageTime());
        }
        if (dto.getIsActive() != null) {
            streak.setIsActive(dto.getIsActive());
        }

        Streak updatedStreak = streakRepository.save(streak);
        return mapToResponseDTO(updatedStreak);
    }

    @Transactional
    public StreakResponseDTO recordUsage(Long streakId) {
        Streak streak = streakRepository.findById(streakId)
                .orElseThrow(() -> new RuntimeException("Streak not found with id: " + streakId));

        LocalDate today = LocalDate.now();
        LocalDate lastUsed = streak.getLastUsedDate();

        if (lastUsed != null && lastUsed.equals(today)) {
            throw new RuntimeException("Usage already recorded for today");
        }

        // Seri kontrolü
        if (lastUsed != null) {
            long daysBetween = ChronoUnit.DAYS.between(lastUsed, today);

            if (daysBetween == 1) {
                // Seri devam ediyor
                streak.setCurrentStreak(streak.getCurrentStreak() + 1);
            } else if (daysBetween > 1) {
                // Seri kırıldı
                streak.setCurrentStreak(1);
            }
        } else {
            // İlk kullanım
            streak.setCurrentStreak(1);
        }

        // En uzun seriyi güncelle
        if (streak.getCurrentStreak() > streak.getLongestStreak()) {
            streak.setLongestStreak(streak.getCurrentStreak());
        }

        streak.setLastUsedDate(today);
        streak.setTotalUses(streak.getTotalUses() + 1);

        Streak updatedStreak = streakRepository.save(streak);
        return mapToResponseDTO(updatedStreak);
    }

    @Transactional
    public void deleteStreak(Long id) {
        if (!streakRepository.existsById(id)) {
            throw new RuntimeException("Streak not found with id: " + id);
        }
        streakRepository.deleteById(id);
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
                .usageTime(streak.getUsageTime())
                .totalUses(streak.getTotalUses())
                .isActive(streak.getIsActive())
                .createdAt(streak.getCreatedAt())
                .updatedAt(streak.getUpdatedAt())
                .build();
    }
}