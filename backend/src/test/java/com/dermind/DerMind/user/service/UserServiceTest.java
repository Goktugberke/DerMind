package com.dermind.DerMind.user.service;

import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.user.dto.UserCreateDto;
import com.dermind.DerMind.user.dto.UserResponseDTO;
import com.dermind.DerMind.user.dto.UserUpdateDto;
import com.dermind.DerMind.user.mapper.UserMapper;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock UserMapper userMapper;

    @InjectMocks UserService userService;

    private User makeUser(String id, String email) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setName("Test User");
        return u;
    }

    private UserResponseDTO makeResponse(String id, String email) {
        return new UserResponseDTO(id, email, "Test User", null, null, false, null);
    }

    // ── handleFirebaseLogin ─────────────────────────────────────────────

    @Test
    @DisplayName("handleFirebaseLogin: yeni kullanıcı oluşturulur")
    void handleFirebaseLogin_newUser_createsAndReturns() {
        when(userRepository.findById("uid-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponseDTO(any(User.class))).thenReturn(makeResponse("uid-1", "user@test.com"));

        UserResponseDTO result = userService.handleFirebaseLogin("uid-1", "user@test.com", "Name", null);

        assertThat(result.getId()).isEqualTo("uid-1");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("handleFirebaseLogin: mevcut kullanıcı adı/foto güncellenir")
    void handleFirebaseLogin_existingUser_updatesNameAndPicture() {
        User existing = makeUser("uid-1", "user@test.com");
        when(userRepository.findById("uid-1")).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);
        when(userMapper.toResponseDTO(existing)).thenReturn(makeResponse("uid-1", "user@test.com"));

        userService.handleFirebaseLogin("uid-1", "user@test.com", "Updated Name", "http://pic.url");

        assertThat(existing.getName()).isEqualTo("Updated Name");
        assertThat(existing.getPicture()).isEqualTo("http://pic.url");
        verify(userRepository).save(existing);
    }

    @Test
    @DisplayName("handleFirebaseLogin: email lookup backward compat — UID ile bulunamazsa email ile aranır")
    void handleFirebaseLogin_uidMiss_emailFallback() {
        User byEmail = makeUser("old-uid", "user@test.com");
        when(userRepository.findById("new-uid")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(byEmail));
        when(userRepository.save(byEmail)).thenReturn(byEmail);
        when(userMapper.toResponseDTO(byEmail)).thenReturn(makeResponse("old-uid", "user@test.com"));

        userService.handleFirebaseLogin("new-uid", "user@test.com", "Name", null);

        verify(userRepository).save(byEmail);
        verify(userRepository, never()).save(argThat(u -> u != byEmail));
    }

    @Test
    @DisplayName("handleFirebaseLogin: null UID → BusinessException")
    void handleFirebaseLogin_nullUid_throws() {
        assertThatThrownBy(() -> userService.handleFirebaseLogin(null, "e@test.com", "N", null))
                .isInstanceOf(BusinessException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("handleFirebaseLogin: blank email → BusinessException")
    void handleFirebaseLogin_blankEmail_throws() {
        assertThatThrownBy(() -> userService.handleFirebaseLogin("uid", "  ", "N", null))
                .isInstanceOf(BusinessException.class);
        verify(userRepository, never()).save(any());
    }

    // ── getUserById ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getUserById: bulunamazsa ResourceNotFoundException")
    void getUserById_notFound_throws() {
        when(userRepository.findById("x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> userService.getUserById("x"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── getUserByEmail ───────────────────────────────────────────────────

    @Test
    @DisplayName("getUserByEmail: bulunamazsa ResourceNotFoundException")
    void getUserByEmail_notFound_throws() {
        when(userRepository.findByEmail("no@test.com")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> userService.getUserByEmail("no@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── createUser ───────────────────────────────────────────────────────

    @Test
    @DisplayName("createUser: email zaten varsa BusinessException")
    void createUser_duplicateEmail_throws() {
        UserCreateDto dto = new UserCreateDto();
        dto.setEmail("dup@test.com");
        when(userRepository.existsByEmail("dup@test.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.createUser(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("dup@test.com");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("createUser: benzersiz email → kayıt edilir")
    void createUser_uniqueEmail_persists() {
        UserCreateDto dto = new UserCreateDto();
        dto.setEmail("new@test.com");
        User entity = makeUser(null, "new@test.com");
        User saved = makeUser("uid-new", "new@test.com");

        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(userMapper.toEntity(dto)).thenReturn(entity);
        when(userRepository.save(entity)).thenReturn(saved);
        when(userMapper.toResponseDTO(saved)).thenReturn(makeResponse("uid-new", "new@test.com"));

        UserResponseDTO result = userService.createUser(dto);

        assertThat(result.getId()).isEqualTo("uid-new");
        verify(userRepository).save(entity);
    }

    // ── updateUser ───────────────────────────────────────────────────────

    @Test
    @DisplayName("updateUser: bulunamazsa ResourceNotFoundException")
    void updateUser_notFound_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> userService.updateUser("missing", new UserUpdateDto()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUser: mapper çağrılır ve save edilir")
    void updateUser_callsMapperAndSaves() {
        User user = makeUser("uid-1", "u@test.com");
        UserUpdateDto dto = new UserUpdateDto();
        when(userRepository.findById("uid-1")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(userMapper.toResponseDTO(user)).thenReturn(makeResponse("uid-1", "u@test.com"));

        userService.updateUser("uid-1", dto);

        verify(userMapper).updateEntity(user, dto);
        verify(userRepository).save(user);
    }

    // ── deleteUser ───────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteUser: bulunamazsa ResourceNotFoundException")
    void deleteUser_notFound_throws() {
        when(userRepository.existsById("x")).thenReturn(false);
        assertThatThrownBy(() -> userService.deleteUser("x"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteUser: mevcut kullanıcı silinir")
    void deleteUser_exists_deletes() {
        when(userRepository.existsById("uid-1")).thenReturn(true);
        userService.deleteUser("uid-1");
        verify(userRepository).deleteById("uid-1");
    }

    // ── getAllUsers ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getAllUsers: boş liste döner")
    void getAllUsers_empty_returnsEmptyList() {
        when(userRepository.findAll()).thenReturn(List.of());
        assertThat(userService.getAllUsers()).isEmpty();
    }

    @Test
    @DisplayName("getAllUsers: mapper her kullanıcıya uygulanır")
    void getAllUsers_mapsEachUser() {
        User u1 = makeUser("1", "a@test.com");
        User u2 = makeUser("2", "b@test.com");
        when(userRepository.findAll()).thenReturn(List.of(u1, u2));
        when(userMapper.toResponseDTO(u1)).thenReturn(makeResponse("1", "a@test.com"));
        when(userMapper.toResponseDTO(u2)).thenReturn(makeResponse("2", "b@test.com"));

        List<UserResponseDTO> result = userService.getAllUsers();

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UserResponseDTO::getId).containsExactly("1", "2");
    }
}
