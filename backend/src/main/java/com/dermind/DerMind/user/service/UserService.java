package com.dermind.DerMind.user.service;

import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.user.dto.*;
import com.dermind.DerMind.user.mapper.UserMapper;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDetailDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toDetailDTO(user);
    }

    @Transactional(readOnly = true)
    public UserResponseDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return userMapper.toResponseDTO(user);
    }

    @Transactional
    public UserResponseDTO createUser(UserCreateDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Bu e-posta ile zaten bir kullanıcı mevcut: " + dto.getEmail());
        }
        User user = userMapper.toEntity(dto);
        return userMapper.toResponseDTO(userRepository.save(user));
    }

    @Transactional
    public UserResponseDTO updateUser(String id, UserUpdateDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        userMapper.updateEntity(user, dto);
        return userMapper.toResponseDTO(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserResponseDTO> getUsersBySkinType(String skinType) {
        return userRepository.findBySkinType(skinType).stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponseDTO> searchUsersByName(String name) {
        return userRepository.searchByName(name).stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDetailDTO> getMostActiveUsers() {
        return userRepository.findMostActiveUsers().stream()
                .map(userMapper::toDetailDTO)
                .collect(Collectors.toList());
    }

    /**
     * Firebase login — frontend Firebase auth sonrası kullanıcıyı kayıt/güncelle.
     * Tek doğru kaynak: Firebase UID. Mevcut email kontrolü ile race condition önlenir.
     */
    @Transactional
    public UserResponseDTO handleFirebaseLogin(String firebaseUid, String email, String name, String picture) {
        if (firebaseUid == null || firebaseUid.isBlank() || email == null || email.isBlank()) {
            throw new BusinessException("firebaseUid ve email zorunlu");
        }

        // Önce UID ile bul (idempotent), yoksa email ile (mevcut user'lar için backward compat)
        User user = userRepository.findById(firebaseUid)
                .orElseGet(() -> userRepository.findByEmail(email).orElse(null));

        if (user == null) {
            user = new User();
            user.setId(firebaseUid);
            user.setProvider("firebase");
            user.setProviderId(firebaseUid);
            user.setEmail(email);
            user.setName(name);
            user.setPicture(picture);
            log.info("New Firebase user created: {} ({})", firebaseUid, email);
        } else {
            user.setName(name);
            user.setPicture(picture);
            // Email güncelleme tehlikeli (unique constraint), sadece eşleşmiyorsa logla
            if (!email.equalsIgnoreCase(user.getEmail())) {
                log.warn("Email mismatch for user {}: stored={}, firebase={}",
                        firebaseUid, user.getEmail(), email);
            }
        }
        return userMapper.toResponseDTO(userRepository.save(user));
    }

    /** Alerjen stringini normalize et: trim, lowercase, boşlukları temizle. */
    public static String normalizeAllergens(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String result = java.util.Arrays.stream(raw.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.joining(","));
        return result.isEmpty() ? null : result;
    }
}
