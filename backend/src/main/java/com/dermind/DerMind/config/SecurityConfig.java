package com.dermind.DerMind.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.dermind.DerMind.security.FirebaseTokenFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final FirebaseTokenFilter firebaseTokenFilter;
    private final RateLimitFilter rateLimitFilter;
    private final IdempotencyFilter idempotencyFilter;

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOriginsRaw;

    public SecurityConfig(FirebaseTokenFilter firebaseTokenFilter,
                          RateLimitFilter rateLimitFilter,
                          IdempotencyFilter idempotencyFilter) {
        this.firebaseTokenFilter = firebaseTokenFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.idempotencyFilter = idempotencyFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/users/firebase").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/users/email/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ratings/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/products/sync-prices").permitAll()
                        .requestMatchers("/api/ai/health").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Admin-only product mutations
                        .requestMatchers(HttpMethod.POST, "/api/products").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole("ADMIN")
                        // Admin-only user listing
                        .requestMatchers(HttpMethod.GET, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/skin-type/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/active/top").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/search").hasRole("ADMIN")
                        // Admin-only purchase listing
                        .requestMatchers(HttpMethod.GET, "/api/purchases").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/purchases/status/**").hasRole("ADMIN")
                        // Admin-only streak
                        .requestMatchers(HttpMethod.GET, "/api/streaks/all").hasRole("ADMIN")
                        // Everything else requires authentication
                        .anyRequest().authenticated())
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(firebaseTokenFilter, UsernamePasswordAuthenticationFilter.class)
                // Idempotency filter — auth sonrası, request body controller'a ulaşmadan önce
                .addFilterAfter(idempotencyFilter, FirebaseTokenFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Last-Event-ID"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }
}
