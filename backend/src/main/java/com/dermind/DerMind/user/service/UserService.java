package com.dermind.DerMind.user.service;

import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.user.dto.*;
import com.dermind.DerMind.user.mapper.UserMapper;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    public Page<UserResponseDTO> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(userMapper::toResponseDTO);
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
     * Firebase login — @Transactional YOK, böylece saveAndFlush'ın kendi transaction'ı
     * tamamlanır ve DataIntegrityViolationException yakalanabilir (race condition koruması).
     */
    public UserResponseDTO handleFirebaseLogin(String firebaseUid, String email, String name, String picture) {
        if (firebaseUid == null || firebaseUid.isBlank() || email == null || email.isBlank()) {
            throw new BusinessException("firebaseUid ve email zorunlu");
        }

        User existing = userRepository.findById(firebaseUid)
                .orElseGet(() -> userRepository.findByEmail(email).orElse(null));

        if (existing != null) {
            existing.setName(name);
            existing.setPicture(picture);
            if (!email.equalsIgnoreCase(existing.getEmail())) {
                log.warn("Email mismatch for user {}: stored={}, firebase={}",
                        firebaseUid, existing.getEmail(), email);
            }
            return userMapper.toResponseDTO(userRepository.save(existing));
        }

        User newUser = new User();
        newUser.setId(firebaseUid);
        newUser.setProvider("firebase");
        newUser.setProviderId(firebaseUid);
        newUser.setEmail(email);
        newUser.setName(name);
        newUser.setPicture(picture);

        try {
            log.info("New Firebase user created: {} ({})", firebaseUid, email);
            return userMapper.toResponseDTO(userRepository.saveAndFlush(newUser));
        } catch (DataIntegrityViolationException e) {
            // Eş zamanlı ilk-login: başka bir istek aynı kullanıcıyı yarattı; kazananı fetch et
            log.warn("Concurrent Firebase login for {} — fetching winner", firebaseUid);
            return userMapper.toResponseDTO(
                    userRepository.findById(firebaseUid)
                            .or(() -> userRepository.findByEmail(email))
                            .orElseThrow(() -> new BusinessException("Login çakışması, lütfen tekrar deneyin")));
        }
    }
}
