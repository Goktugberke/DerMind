package com.dermind.DerMind.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
        // Çok düşük limit → kolay tetiklenebilir
        ReflectionTestUtils.setField(filter, "productDetailRpm", 2);
        ReflectionTestUtils.setField(filter, "aiRpm", 2);
    }

    private MockHttpServletRequest req(String method, String path) {
        MockHttpServletRequest r = new MockHttpServletRequest(method, path);
        r.setRemoteAddr("192.168.1.1");
        return r;
    }

    // ── korunan yollar — rate limit aktif ─────────────────────────────────

    @Test
    @DisplayName("GET /api/products/{id} — limit aşılınca 429 döner")
    void productDetail_rateLimitExceeded_returns429() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // İlk 2 istek geçmeli
        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest request = req("GET", "/api/products/42");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isNotEqualTo(429);
        }

        // 3. istek sınırı aşar
        MockHttpServletRequest request = req("GET", "/api/products/42");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        assertThat(response.getContentType()).isEqualTo(MediaType.APPLICATION_JSON_VALUE);
        assertThat(response.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
    }

    @Test
    @DisplayName("/api/ai/score — limit aşılınca 429 döner")
    void aiEndpoint_rateLimitExceeded_returns429() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest request = req("GET", "/api/ai/score/1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
        }

        MockHttpServletRequest request = req("GET", "/api/ai/score/1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
    }

    // ── korunmayan yollar — her zaman geçer ──────────────────────────────

    @Test
    @DisplayName("/api/ai/health — rate limit dışında, her zaman geçer")
    void aiHealth_notRateLimited_alwaysPassesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // 10 kez aynı IP'den çek, hepsi geçmeli (rpm=2 iken)
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = req("GET", "/api/ai/health");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isNotEqualTo(429);
        }

        verify(chain, times(10)).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class));
    }

    @Test
    @DisplayName("GET /api/products (liste) — rate limit dışında")
    void productList_notRateLimited_passesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = req("GET", "/api/products");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
        }

        verify(chain, times(5)).doFilter(any(), any());
    }

    @Test
    @DisplayName("POST /api/products/{id} — yalnızca GET korumalı, POST geçer")
    void productDetailPost_notRateLimited_passesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = req("POST", "/api/products/42");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
        }

        verify(chain, times(5)).doFilter(any(), any());
    }

    @Test
    @DisplayName("/api/users — herhangi bir yol, rate limit dışında")
    void usersEndpoint_notRateLimited_passesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = req("GET", "/api/users");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
        }

        verify(chain, times(5)).doFilter(any(), any());
    }

    // ── IP ayrımı ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Farklı IP'ler birbirinin bucket'ını paylaşmaz")
    void differentIps_separateBuckets() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // IP-A 2 istek geçirir, bucket dolar
        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest r = new MockHttpServletRequest("GET", "/api/products/1");
            r.setRemoteAddr("10.0.0.1");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilterInternal(r, res, chain);
        }

        // IP-B ilk isteği hâlâ geçmeli
        MockHttpServletRequest r2 = new MockHttpServletRequest("GET", "/api/products/1");
        r2.setRemoteAddr("10.0.0.2");
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(r2, res2, chain);

        assertThat(res2.getStatus()).isNotEqualTo(429);
    }

    // ── X-Forwarded-For ────────────────────────────────────────────────────

    @Test
    @DisplayName("X-Forwarded-For header varsa gerçek IP alınır")
    void xForwardedFor_usesFirstIp() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // Proxy arkasındaki istemci: 1.2.3.4, proxy: 5.6.7.8
        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest r = new MockHttpServletRequest("GET", "/api/products/1");
            r.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8");
            r.setRemoteAddr("5.6.7.8");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilterInternal(r, res, chain);
        }

        // 3. istek — 1.2.3.4'ün bucket'ı doldu
        MockHttpServletRequest r3 = new MockHttpServletRequest("GET", "/api/products/1");
        r3.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8");
        r3.setRemoteAddr("5.6.7.8");
        MockHttpServletResponse res3 = new MockHttpServletResponse();
        filter.doFilterInternal(r3, res3, chain);

        assertThat(res3.getStatus()).isEqualTo(429);
    }
}
