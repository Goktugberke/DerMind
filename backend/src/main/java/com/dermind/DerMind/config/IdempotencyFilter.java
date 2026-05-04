package com.dermind.DerMind.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Idempotency-Key header desteği — duplicate POST/PUT isteklerinde
 * önceki response cache'lenir, mobile retry'ları para çekmez veya satın alma duplicate yaratmaz.
 *
 * Header: Idempotency-Key: <uuid>
 * Sadece POST/PUT/PATCH üzerinde aktif. 24 saat TTL.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IdempotencyFilter extends OncePerRequestFilter {

    private static final String HEADER = "Idempotency-Key";

    private final Cache<String, CachedResponse> cache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofHours(24))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        if (!isMutating(request) || request.getHeader(HEADER) == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = request.getMethod() + ":" + request.getRequestURI() + ":" + request.getHeader(HEADER);
        CachedResponse cached = cache.getIfPresent(key);
        if (cached != null) {
            log.debug("Idempotency cache HIT for {}", key);
            response.setStatus(cached.status);
            response.setContentType(cached.contentType);
            response.getWriter().write(cached.body);
            return;
        }

        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        chain.doFilter(request, wrapper);

        // Sadece 2xx response'ları cache'le (hata durumunda retry serbest)
        if (wrapper.getStatus() >= 200 && wrapper.getStatus() < 300) {
            String body = new String(wrapper.getContentAsByteArray());
            cache.put(key, new CachedResponse(
                    wrapper.getStatus(),
                    wrapper.getContentType() != null ? wrapper.getContentType() : MediaType.APPLICATION_JSON_VALUE,
                    body));
        }
        wrapper.copyBodyToResponse();
    }

    private boolean isMutating(HttpServletRequest req) {
        String m = req.getMethod();
        return "POST".equals(m) || "PUT".equals(m) || "PATCH".equals(m);
    }

    private record CachedResponse(int status, String contentType, String body) {}
}
