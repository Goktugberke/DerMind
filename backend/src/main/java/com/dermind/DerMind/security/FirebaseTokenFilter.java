package com.dermind.DerMind.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Firebase ID Token doğrulama filter'ı.
 *
 * Davranış:
 *   - Authorization header yoksa: filter chain'e devam (public endpoint'ler için)
 *   - "Bearer <token>" formatında değilse: 401 + JSON body
 *   - Token doğrulanamıyorsa: 401 + JSON body
 *   - Token geçerliyse: SecurityContext'e UsernamePasswordAuthenticationToken yerleştirir
 *
 * Authorities:
 *   - ROLE_USER (default)
 *   - ROLE_ADMIN (Firebase custom claim "admin: true" varsa)
 */
@Component
@Slf4j
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Firebase başlatılmadıysa (service account eksik) tüm istekleri geçir
        if (FirebaseApp.getApps().isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader(AUTH_HEADER);

        // Public endpoint — auth header yok, devam et
        if (header == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!header.startsWith(BEARER_PREFIX)) {
            writeUnauthorized(response, "INVALID_AUTH_HEADER",
                    "Authorization header must start with 'Bearer '");
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            writeUnauthorized(response, "EMPTY_TOKEN", "Bearer token is empty");
            return;
        }

        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
            String email = decodedToken.getEmail();

            if (email == null || email.isBlank()) {
                writeUnauthorized(response, "TOKEN_MISSING_EMAIL",
                        "Firebase token does not contain a verified email");
                return;
            }

            List<GrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

            // Custom claim: admin
            Object adminClaim = decodedToken.getClaims().get("admin");
            if (adminClaim instanceof Boolean && (Boolean) adminClaim) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(email, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Authenticated user via Firebase token: {} (admin={})",
                    email, authorities.stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())));

        } catch (FirebaseAuthException e) {
            log.warn("Firebase token verification failed: {}", e.getMessage());
            writeUnauthorized(response, "INVALID_TOKEN", "Firebase token is invalid or expired");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private void writeUnauthorized(HttpServletResponse response, String code, String message) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(MAPPER.writeValueAsString(
                java.util.Map.of("errorCode", code, "message", message)));
    }
}
