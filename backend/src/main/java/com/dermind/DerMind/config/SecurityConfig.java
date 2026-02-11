package com.dermind.DerMind.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.dermind.DerMind.security.CustomOAuth2UserService;
import com.dermind.DerMind.security.FirebaseTokenFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final CustomOAuth2UserService customOAuth2UserService;
        private final FirebaseTokenFilter firebaseTokenFilter;

        public SecurityConfig(CustomOAuth2UserService customOAuth2UserService,
                        FirebaseTokenFilter firebaseTokenFilter) {
                this.customOAuth2UserService = customOAuth2UserService;
                this.firebaseTokenFilter = firebaseTokenFilter;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(Customizer.withDefaults())
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/users/firebase").permitAll()
                                                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/users")
                                                .permitAll()
                                                .requestMatchers("/api/users/email/**").permitAll()
                                                .requestMatchers("/api/products/**").permitAll()
                                                .requestMatchers("/api/ratings/**").permitAll()
                                                .requestMatchers("/", "/login").permitAll()
                                                .anyRequest().authenticated())
                                .addFilterBefore(firebaseTokenFilter, UsernamePasswordAuthenticationFilter.class)
                                .httpBasic(Customizer.withDefaults());
                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                // Vite'tan gelen isteklere izin ver
                configuration.setAllowedOrigins(List.of("http://localhost:5173"));
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration("/**", configuration);

                return source;
        }

        @Bean
        public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
                return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        }
}