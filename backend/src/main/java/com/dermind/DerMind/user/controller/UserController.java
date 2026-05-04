package com.dermind.DerMind.user.controller;

import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.dto.UserCreateDto;
import com.dermind.DerMind.user.dto.UserDetailDTO;
import com.dermind.DerMind.user.dto.UserResponseDTO;
import com.dermind.DerMind.user.dto.UserUpdateDto;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    /**
     * Firebase token doğrulama / kullanıcı kayıt-güncelle.
     * Public endpoint — frontend Firebase auth sonrası bu endpoint'i çağırır.
     */
    @PostMapping("/firebase")
    public ResponseEntity<UserResponseDTO> verifyFirebaseToken(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name = body.get("name");
        String picture = body.get("picture");
        String uid = body.get("uid");
        UserResponseDTO userResponse = userService.handleFirebaseLogin(uid, email, name, picture);
        return ResponseEntity.ok(userResponse);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<org.springframework.data.domain.Page<UserResponseDTO>> getAllUsers(
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@authz.isSelf(#id) or hasRole('ADMIN')")
    public ResponseEntity<UserDetailDTO> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * Authenticated user'ın kendi profili.
     */
    @GetMapping("/me")
    public ResponseEntity<UserDetailDTO> getCurrentUser(@CurrentUser User user) {
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<UserResponseDTO> getUserByEmail(@PathVariable String email) {
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    /**
     * Kullanıcı kayıt — sadece /api/users/firebase üzerinden olmalı.
     * Bu endpoint admin-only veya internal tooling için kalmıştır.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UserResponseDTO> createUser(@Valid @RequestBody UserCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@authz.isSelf(#id) or hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UserUpdateDto dto) {
        return ResponseEntity.ok(userService.updateUser(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@authz.isSelf(#id) or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/skin-type/{skinType}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponseDTO>> getUsersBySkinType(@PathVariable String skinType) {
        return ResponseEntity.ok(userService.getUsersBySkinType(skinType));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponseDTO>> searchUsers(@RequestParam String name) {
        return ResponseEntity.ok(userService.searchUsersByName(name));
    }

    @GetMapping("/active/top")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDetailDTO>> getMostActiveUsers() {
        return ResponseEntity.ok(userService.getMostActiveUsers());
    }
}
