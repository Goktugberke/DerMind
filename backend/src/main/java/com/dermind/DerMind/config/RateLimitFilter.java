package com.dermind.DerMind.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * IP başına token-bucket rate limiter.
 * Korunan yollar:
 *   - GET /api/products/{id}  — AI çağrısı tetikler, pahalı
 *   - /api/ai/**              — Doğrudan AI server proxy, çok pahalı
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // Maksimum 50_000 IP; 2 dakika kullanılmayan bucket otomatik silinir
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterAccess(Duration.ofMinutes(2))
            .build();

    @Value("${ratelimit.product-detail.requests-per-minute:60}")
    private int productDetailRpm;

    @Value("${ratelimit.ai.requests-per-minute:20}")
    private int aiRpm;

    private Bucket resolveBucket(String key, int rpm) {
        return buckets.get(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(rpm)
                        .refillGreedy(rpm, Duration.ofMinutes(1))
                        .build())
                .build());
    }

    private boolean isRateLimited(HttpServletRequest request) {
        String path   = request.getRequestURI();
        String method = request.getMethod();
        String ip     = clientIp(request);

        if ("GET".equalsIgnoreCase(method) && path.matches("^/api/products/\\d+$")) {
            return !resolveBucket("product-detail:" + ip, productDetailRpm).tryConsume(1);
        }
        if (path.startsWith("/api/ai/") && !path.equals("/api/ai/health")) {
            return !resolveBucket("ai:" + ip, aiRpm).tryConsume(1);
        }
        return false;
    }

    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isRateLimited(request)) {
            log.warn("Rate limit exceeded for {} {} from {}",
                    request.getMethod(), request.getRequestURI(), clientIp(request));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"errorCode\":\"RATE_LIMIT_EXCEEDED\",\"message\":\"Too many requests, please retry later.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
