package com.dermind.DerMind.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class IdempotencyFilterTest {

    IdempotencyFilter filter;

    @BeforeEach
    void setUp() {
        filter = new IdempotencyFilter();
    }

    private MockHttpServletRequest mutatingReq(String method, String path, String idempotencyKey) {
        MockHttpServletRequest r = new MockHttpServletRequest(method, path);
        if (idempotencyKey != null) {
            r.addHeader("Idempotency-Key", idempotencyKey);
        }
        return r;
    }

    // ── GET/DELETE — filter devredışı ─────────────────────────────────────

    @Test
    @DisplayName("GET isteği — Idempotency-Key başlığı olsa bile filter çalışmaz")
    void getRequest_withIdempotencyKey_passesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = mutatingReq("GET", "/api/orders/1", "key-123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    @DisplayName("DELETE isteği — filter devredışı, direkt geçer")
    void deleteRequest_passesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = mutatingReq("DELETE", "/api/orders/1", "key-123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    // ── Idempotency-Key olmadan mutating istek ────────────────────────────

    @Test
    @DisplayName("POST — Idempotency-Key header yok → direkt geçer, cache'lenmez")
    void postWithoutIdempotencyKey_passesThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = mutatingReq("POST", "/api/purchases", null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class));
    }

    // ── İlk istek — işlenir ve cache'lenir ────────────────────────────────

    @Test
    @DisplayName("POST + Idempotency-Key — ilk istek chain'e geçer")
    void firstPost_withIdempotencyKey_callsChain() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = mutatingReq("POST", "/api/purchases", "idem-key-001");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class));
    }

    // ── İkinci istek (duplicate) — cache'ten döner ─────────────────────────

    @Test
    @DisplayName("Aynı Idempotency-Key ile ikinci POST — chain çağrılmaz, cache'ten döner")
    void duplicatePost_sameIdempotencyKey_returnsCachedResponse() throws Exception {
        // İlk istek
        FilterChain chain = mock(FilterChain.class);
        doAnswer(inv -> {
            HttpServletResponse res = (HttpServletResponse) inv.getArgument(1);
            res.setStatus(201);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"id\":42}");
            return null;
        }).when(chain).doFilter(any(), any());

        MockHttpServletRequest req1 = mutatingReq("POST", "/api/purchases", "idem-key-dup");
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        // İkinci istek — aynı key
        MockHttpServletRequest req2 = mutatingReq("POST", "/api/purchases", "idem-key-dup");
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        // Chain sadece bir kez çağrılmalı (ikinci istekte atlanmalı)
        verify(chain, times(1)).doFilter(any(), any());
        assertThat(res2.getStatus()).isEqualTo(201);
        assertThat(res2.getContentAsString()).isEqualTo("{\"id\":42}");
    }

    // ── Farklı key'ler → ayrı işlem ──────────────────────────────────────

    @Test
    @DisplayName("Farklı Idempotency-Key'ler — her biri ayrı işlenir")
    void differentIdempotencyKeys_processedSeparately() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req1 = mutatingReq("POST", "/api/purchases", "key-A");
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        MockHttpServletRequest req2 = mutatingReq("POST", "/api/purchases", "key-B");
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        verify(chain, times(2)).doFilter(any(), any());
    }

    // ── Hata response'ları cache'lenmez ───────────────────────────────────

    @Test
    @DisplayName("4xx response — cache'lenmez, retry serbest")
    void errorResponse_notCached_retryAllowed() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        doAnswer(inv -> {
            HttpServletResponse res = (HttpServletResponse) inv.getArgument(1);
            res.setStatus(400);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"error\":\"bad request\"}");
            return null;
        }).when(chain).doFilter(any(), any());

        String key = "idem-error-key";

        // İlk istek — 400 döner
        MockHttpServletRequest req1 = mutatingReq("POST", "/api/purchases", key);
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        // İkinci istek — cache'lenmemeli, chain tekrar çağrılmalı
        MockHttpServletRequest req2 = mutatingReq("POST", "/api/purchases", key);
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        verify(chain, times(2)).doFilter(any(), any());
    }

    @Test
    @DisplayName("5xx response — cache'lenmez, retry serbest")
    void serverErrorResponse_notCached_retryAllowed() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        doAnswer(inv -> {
            HttpServletResponse res = (HttpServletResponse) inv.getArgument(1);
            res.setStatus(500);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"error\":\"internal\"}");
            return null;
        }).when(chain).doFilter(any(), any());

        String key = "idem-500-key";

        MockHttpServletRequest req1 = mutatingReq("POST", "/api/purchases", key);
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        MockHttpServletRequest req2 = mutatingReq("POST", "/api/purchases", key);
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        verify(chain, times(2)).doFilter(any(), any());
    }

    // ── PUT / PATCH de korunur ────────────────────────────────────────────

    @Test
    @DisplayName("PUT — Idempotency-Key ile ilk çağrı işlenir, duplicate atlanır")
    void putRequest_withIdempotencyKey_deduplicated() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        doAnswer(inv -> {
            HttpServletResponse res = (HttpServletResponse) inv.getArgument(1);
            res.setStatus(200);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"updated\":true}");
            return null;
        }).when(chain).doFilter(any(), any());

        String key = "put-key-xyz";

        MockHttpServletRequest req1 = mutatingReq("PUT", "/api/users/uid-1", key);
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        MockHttpServletRequest req2 = mutatingReq("PUT", "/api/users/uid-1", key);
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        verify(chain, times(1)).doFilter(any(), any());
        assertThat(res2.getContentAsString()).isEqualTo("{\"updated\":true}");
    }

    @Test
    @DisplayName("PATCH — Idempotency-Key ile duplicate atlanır")
    void patchRequest_withIdempotencyKey_deduplicated() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        doAnswer(inv -> {
            HttpServletResponse res = (HttpServletResponse) inv.getArgument(1);
            res.setStatus(200);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"patched\":true}");
            return null;
        }).when(chain).doFilter(any(), any());

        String key = "patch-key-abc";

        MockHttpServletRequest req1 = mutatingReq("PATCH", "/api/users/uid-1", key);
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        MockHttpServletRequest req2 = mutatingReq("PATCH", "/api/users/uid-1", key);
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        verify(chain, times(1)).doFilter(any(), any());
        assertThat(res2.getStatus()).isEqualTo(200);
    }

    // ── Aynı key, farklı path/method → farklı cache girişi ───────────────

    @Test
    @DisplayName("Aynı Idempotency-Key farklı endpoint'te — ayrı cache girişi oluşur")
    void sameKeyDifferentPath_treatedSeparately() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req1 = mutatingReq("POST", "/api/purchases", "shared-key");
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, chain);

        MockHttpServletRequest req2 = mutatingReq("POST", "/api/cart/items", "shared-key");
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, chain);

        // Farklı path → farklı cache girişi → 2 ayrı istek
        verify(chain, times(2)).doFilter(any(), any());
    }
}
