package com.dermind.DerMind.user.service;

import com.dermind.DerMind.user.dto.*;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // Tüm kullanıcıları getir
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // ID ile kullanıcı getir
    public UserDetailDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return convertToDetailDTO(user);
    }

    public User getUserByProviderId(String providerId) {
        return userRepository.findByProviderId(providerId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + providerId));
    }

    // Email ile kullanıcı getir
    public UserResponseDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        return convertToResponseDTO(user);
    }

    // Yeni kullanıcı oluştur
    @Transactional
    public UserResponseDTO createUser(UserCreateDto dto) {
        // Email kontrolü
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("User already exists with email: " + dto.getEmail());
        }

        User user = new User();
        user.setId(dto.getId());
        user.setEmail(dto.getEmail());
        user.setName(dto.getName());
        user.setAllergens(dto.getAllergens());
        user.setSkinType(dto.getSkinType());
        user.setHasAcne(dto.isHasAcne());
        user.setPicture(dto.getPicture());

        User savedUser = userRepository.save(user);
        return convertToResponseDTO(savedUser);
    }

    // Kullanıcı bilgilerini güncelle
    @Transactional
    public UserResponseDTO updateUser(String id, UserUpdateDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        if (dto.getName() != null) user.setName(dto.getName());
        if (dto.getAllergens() != null) user.setAllergens(dto.getAllergens());
        if (dto.getSkinType() != null) user.setSkinType(dto.getSkinType());
        if (dto.getHasAcne() != null) user.setHasAcne(dto.getHasAcne());
        if (dto.getPicture() != null) user.setPicture(dto.getPicture());

        User updatedUser = userRepository.save(user);
        return convertToResponseDTO(updatedUser);
    }

    // Kullanıcıyı sil
    @Transactional
    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    // Cilt tipine göre kullanıcıları getir
    public List<UserResponseDTO> getUsersBySkinType(String skinType) {
        return userRepository.findBySkinType(skinType)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // İsme göre kullanıcı ara
    public List<UserResponseDTO> searchUsersByName(String name) {
        return userRepository.searchByName(name)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // En aktif kullanıcıları getir
    public List<UserDetailDTO> getMostActiveUsers() {
        return userRepository.findMostActiveUsers()
                .stream()
                .map(this::convertToDetailDTO)
                .collect(Collectors.toList());
    }

    // DTO Dönüşüm metodları
    private UserResponseDTO convertToResponseDTO(User user) {
        return new UserResponseDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getAllergens(),
                user.getSkinType(),
                user.isHasAcne(),
                user.getPicture()
        );
    }

    private UserDetailDTO convertToDetailDTO(User user) {
        return new UserDetailDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getAllergens(),
                user.getSkinType(),
                user.isHasAcne(),
                user.getPicture(),
                user.getPurchases() != null ? user.getPurchases().size() : 0,
                user.getRatings() != null ? user.getRatings().size() : 0,
                user.getStreaks() != null ? (int) user.getStreaks().stream()
                        .filter(s -> s.getCurrentStreak() > 0).count() : 0
        );
    }
}
