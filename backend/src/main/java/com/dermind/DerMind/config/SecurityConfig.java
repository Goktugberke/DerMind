package com.dermind.DerMind.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration; // Bunu ekle
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain; // Bunu ekle
import org.springframework.web.cors.CorsConfiguration; // Bunu ekle
import org.springframework.web.cors.CorsConfigurationSource; // Bunu ekle
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.dermind.DerMind.security.CustomOAuth2UserService;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final CustomOAuth2UserService customOAuth2UserService;

        public SecurityConfig(CustomOAuth2UserService customOAuth2UserService) {
                this.customOAuth2UserService = customOAuth2UserService;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(Customizer.withDefaults())
                                .csrf(csrf -> csrf.disable())
                                // BU SATIRI EKLE: Spring'in seni kafasına göre yönlendirmesini engeller
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                // Firebase adresine ÖZEL İZİN VER (Yolun doğruluğundan emin ol)
                                                .requestMatchers("/api/users/firebase").permitAll()
                                                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/users")
                                                .permitAll() // Sadece kayıt olmaya izin ver
                                                .requestMatchers("/api/users/email/**").permitAll() // Email kontrolüne
                                                                                                    // izin ver
                                                .requestMatchers("/api/products/**").permitAll() // Ürünlere herkes
                                                                                                 // bakabilsin
                                                .requestMatchers("/api/ratings/**").permitAll() // Yorumları herkes
                                                                                                // okuyabilsin
                                                .requestMatchers("/", "/login").permitAll()
                                                .anyRequest().authenticated())
                                .httpBasic(Customizer.withDefaults()); // Basic Auth'u etkinleştir
                return http.build();
        }

        // 2. ADIM: İzin verilen originleri tanımla
        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                // Vite'tan gelen isteklere izin ver
                configuration.setAllowedOrigins(List.of("http://localhost:5173"));
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                // HATALI SATIRI BURAYLA DEĞİŞTİR:
                source.registerCorsConfiguration("/**", configuration);

                return source;
        }

        @Bean
        public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
                return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        }
}