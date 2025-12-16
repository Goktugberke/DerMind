package com.dermind.DerMind.user.controller;

import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.dto.*;
import com.dermind.DerMind.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Get all users
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        List<UserResponseDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * Get user by ID
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserDetailDTO> getUserById(@PathVariable String id) {
        try {
            UserDetailDTO user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * LOGIN OLAN KULLANICI
     */
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal OidcUser principal) {
        User user = userService.getUserByProviderId(principal.getSubject());
        return ResponseEntity.ok(user);
    }

    /**
     * GOOGLE SUB İLE USER BUL
     */
    @GetMapping("/provider/{providerId}")
    public ResponseEntity<User> getByProviderId(@PathVariable String providerId) {
        User user = userService.getUserByProviderId(providerId);
        return ResponseEntity.ok(user);
    }
    /**
     * Get user by email
     * GET /api/users/email/{email}
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<UserResponseDTO> getUserByEmail(@PathVariable String email) {
        try {
            UserResponseDTO user = userService.getUserByEmail(email);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create new user
     * POST /api/users
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<?> createUser(@Valid @RequestBody UserCreateDto dto) {
        try {
            UserResponseDTO createdUser = userService.createUser(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update user
     * PUT /api/users/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UserUpdateDto dto) {
        try {
            UserResponseDTO updatedUser = userService.updateUser(id, dto);
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete user
     * DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get users by skin type
     * GET /api/users/skin-type/{skinType}
     */
    @GetMapping("/skin-type/{skinType}")
    public ResponseEntity<List<UserResponseDTO>> getUsersBySkinType(@PathVariable String skinType) {
        List<UserResponseDTO> users = userService.getUsersBySkinType(skinType);
        return ResponseEntity.ok(users);
    }

    /**
     * Search users by name
     * GET /api/users/search?name={name}
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserResponseDTO>> searchUsers(@RequestParam String name) {
        List<UserResponseDTO> users = userService.searchUsersByName(name);
        return ResponseEntity.ok(users);
    }

    /**
     * Get most active users
     * GET /api/users/active/top
     */
    @GetMapping("/active/top")
    public ResponseEntity<List<UserDetailDTO>> getMostActiveUsers() {
        List<UserDetailDTO> users = userService.getMostActiveUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/home")
    public ResponseEntity<String> homePage() {
        return ResponseEntity.ok("Oturum açma başarılı! Ana sayfaya hoş geldiniz.");
    }

    @GetMapping("/auth-info")
    public Map<String, Object> getAuthInfo(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> authInfo = new HashMap<>();

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof OAuth2AuthenticationToken oauthToken) {
            authInfo.put("authenticated", true);
            authInfo.put("authenticationType", "OAuth2");
            authInfo.put("authorizedClientRegistrationId", oauthToken.getAuthorizedClientRegistrationId());

            if (principal instanceof OidcUser oidcUser) {
                authInfo.put("principalType", "OidcUser");
                authInfo.put("userId", oidcUser.getAttribute("sub"));
                authInfo.put("email", oidcUser.getAttribute("email"));
                authInfo.put("name", oidcUser.getAttribute("name"));
                authInfo.put("picture", oidcUser.getAttribute("picture"));

                authInfo.put("idToken", oidcUser.getIdToken().getTokenValue());
                authInfo.put("tokenExpiresAt", oidcUser.getIdToken().getExpiresAt());

                authInfo.put("allClaims", oidcUser.getClaims());

                authInfo.put("authorities", authentication.getAuthorities().stream()
                        .map(Object::toString)
                        .collect(Collectors.toList()));
            } else {
                authInfo.put("principalType", "OAuth2User");
                authInfo.put("attributes", principal.getAttributes());
            }
        } else {
            authInfo.put("authenticated", false);
            authInfo.put("message", "Not authenticated or not OAuth2");
        }

        return authInfo;
    }
}
