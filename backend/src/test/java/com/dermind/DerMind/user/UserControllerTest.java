package com.dermind.DerMind.user;

import com.dermind.DerMind.config.IdempotencyFilter;
import com.dermind.DerMind.config.RateLimitFilter;
import com.dermind.DerMind.config.SecurityConfig;
import com.dermind.DerMind.config.WebMvcConfig;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.security.AuthorizationService;
import com.dermind.DerMind.security.CurrentUserArgumentResolver;
import com.dermind.DerMind.security.FirebaseTokenFilter;
import com.dermind.DerMind.user.controller.UserController;
import com.dermind.DerMind.user.dto.UserCreateDto;
import com.dermind.DerMind.user.dto.UserDetailDTO;
import com.dermind.DerMind.user.dto.UserResponseDTO;
import com.dermind.DerMind.user.dto.UserUpdateDto;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, CurrentUserArgumentResolver.class})
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean UserService userService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean FirebaseTokenFilter firebaseTokenFilter;
    @MockitoBean RateLimitFilter rateLimitFilter;
    @MockitoBean IdempotencyFilter idempotencyFilter;
    @MockitoBean(name = "authz") AuthorizationService authorizationService;

    private User mockUser;

    @BeforeEach
    void setup() throws Exception {
        mockUser = new User();
        mockUser.setId("uid-1");
        mockUser.setEmail("user@test.com");

        doAnswer(inv -> { FilterChain c = inv.getArgument(2); c.doFilter(inv.getArgument(0), inv.getArgument(1)); return null; })
                .when(firebaseTokenFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
        doAnswer(inv -> { FilterChain c = inv.getArgument(2); c.doFilter(inv.getArgument(0), inv.getArgument(1)); return null; })
                .when(rateLimitFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
        doAnswer(inv -> { FilterChain c = inv.getArgument(2); c.doFilter(inv.getArgument(0), inv.getArgument(1)); return null; })
                .when(idempotencyFilter).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class), any(FilterChain.class));
    }

    private UserResponseDTO makeResponse(String id, String email) {
        return new UserResponseDTO(id, email, "Test User", null, null, false, null);
    }

    private UserDetailDTO makeDetail(String id) {
        return new UserDetailDTO(id, "user@test.com", "Test User", null, "normal", false, null, 0, 0, 0);
    }

    // ── POST /api/users/firebase (public endpoint) ────────────────────────

    @Test
    void verifyFirebaseToken_publicEndpoint_returns200() throws Exception {
        when(userService.handleFirebaseLogin("uid-1", "user@test.com", "Test User", null))
                .thenReturn(makeResponse("uid-1", "user@test.com"));

        String body = objectMapper.writeValueAsString(
                Map.of("uid", "uid-1", "email", "user@test.com", "name", "Test User"));

        mockMvc.perform(post("/api/users/firebase").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("uid-1"));
    }

    // ── GET /api/users (ADMIN only) ───────────────────────────────────────

    @Test
    void getAllUsers_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getAllUsers_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getAllUsers_admin_returnsPage() throws Exception {
        Page<UserResponseDTO> page = new PageImpl<>(List.of(
                makeResponse("uid-1", "a@test.com"),
                makeResponse("uid-2", "b@test.com")));
        when(userService.getAllUsers(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    // ── GET /api/users/me ─────────────────────────────────────────────────

    @Test
    void getCurrentUser_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getCurrentUser_authenticated_returnsOwnProfile() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(userService.getUserById("uid-1")).thenReturn(makeDetail("uid-1"));

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("uid-1"));
    }

    // ── GET /api/users/{id} (self or ADMIN) ───────────────────────────────

    @Test
    void getUserById_anonymous_returns403() throws Exception {
        mockMvc.perform(get("/api/users/uid-1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getUserById_self_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isSelf("uid-1")).thenReturn(true);
        when(userService.getUserById("uid-1")).thenReturn(makeDetail("uid-1"));

        mockMvc.perform(get("/api/users/uid-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("uid-1"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void getUserById_otherUser_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isSelf("uid-other")).thenReturn(false);

        mockMvc.perform(get("/api/users/uid-other"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getUserById_admin_returns200() throws Exception {
        when(userService.getUserById("uid-1")).thenReturn(makeDetail("uid-1"));

        mockMvc.perform(get("/api/users/uid-1"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getUserById_notFound_returns404() throws Exception {
        when(userService.getUserById("missing"))
                .thenThrow(new ResourceNotFoundException("User", "id", "missing"));

        mockMvc.perform(get("/api/users/missing"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/users/email/{email} (public) ────────────────────────────

    @Test
    void getUserByEmail_publicEndpoint_returns200() throws Exception {
        when(userService.getUserByEmail("user@test.com")).thenReturn(makeResponse("uid-1", "user@test.com"));

        mockMvc.perform(get("/api/users/email/user@test.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("uid-1"));
    }

    @Test
    void getUserByEmail_notFound_returns404() throws Exception {
        when(userService.getUserByEmail("nobody@test.com"))
                .thenThrow(new ResourceNotFoundException("User", "email", "nobody@test.com"));

        mockMvc.perform(get("/api/users/email/nobody@test.com"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/users (ADMIN only) ──────────────────────────────────────

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void createUser_regularUser_returns403() throws Exception {
        mockMvc.perform(post("/api/users").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"uid-x\",\"email\":\"test@test.com\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void createUser_admin_returns201() throws Exception {
        UserCreateDto dto = new UserCreateDto();
        dto.setId("uid-new");
        dto.setEmail("new@test.com");
        dto.setName("New User");
        when(userService.createUser(any())).thenReturn(makeResponse("uid-new", "new@test.com"));

        mockMvc.perform(post("/api/users").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated());
    }

    // ── PUT /api/users/{id} (self or ADMIN) ───────────────────────────────

    @Test
    void updateUser_anonymous_returns403() throws Exception {
        mockMvc.perform(put("/api/users/uid-1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void updateUser_self_returns200() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isSelf("uid-1")).thenReturn(true);
        when(userService.updateUser(eq("uid-1"), any(UserUpdateDto.class)))
                .thenReturn(makeResponse("uid-1", "user@test.com"));

        mockMvc.perform(put("/api/users/uid-1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void updateUser_otherUser_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isSelf("uid-other")).thenReturn(false);

        mockMvc.perform(put("/api/users/uid-other").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /api/users/{id} (self or ADMIN) ────────────────────────────

    @Test
    void deleteUser_anonymous_returns403() throws Exception {
        mockMvc.perform(delete("/api/users/uid-1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteUser_self_returns204() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isSelf("uid-1")).thenReturn(true);
        doNothing().when(userService).deleteUser("uid-1");

        mockMvc.perform(delete("/api/users/uid-1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void deleteUser_otherUser_returns403() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(authorizationService.isSelf("uid-other")).thenReturn(false);

        mockMvc.perform(delete("/api/users/uid-other").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/users/search (ADMIN only) ────────────────────────────────

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void searchUsers_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/users/search").param("name", "Ali"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void searchUsers_admin_returnsList() throws Exception {
        when(userService.searchUsersByName("Ali")).thenReturn(List.of(makeResponse("uid-1", "ali@test.com")));

        mockMvc.perform(get("/api/users/search").param("name", "Ali"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── GET /api/users/active/top (ADMIN only) ─────────────────────────────

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getMostActiveUsers_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/users/active/top"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getMostActiveUsers_admin_returnsList() throws Exception {
        when(userService.getMostActiveUsers()).thenReturn(List.of(makeDetail("uid-1")));

        mockMvc.perform(get("/api/users/active/top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
