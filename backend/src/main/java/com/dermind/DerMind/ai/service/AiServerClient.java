package com.dermind.DerMind.ai.service;

import com.dermind.DerMind.ai.dto.*;
import com.dermind.DerMind.error.AiServerUnavailableException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * AI Server (FastAPI @ port 8000) ile iletişim kuran HTTP istemcisi.
 *
 * Endpoints:
 *   POST /score          — Kişiselleştirilmiş ürün puanı
 *   POST /score/batch    — Çoklu ürün puanı (maks 50)
 *   POST /recommend      — KNN ürün önerisi
 *   POST /explain        — SHAP XAI + LLM açıklaması
 *   POST /explain/stream — SSE streaming XAI açıklaması
 *   GET  /health         — Sunucu sağlık kontrolü
 *   GET  /metrics        — İstatistik verileri
 */
@Slf4j
@Service
public class AiServerClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String aiServerUrl;
    private final String internalKey;

    public AiServerClient(
            @Qualifier("aiRestTemplate") RestTemplate restTemplate,
            @Value("${ai.server.url:http://localhost:8000}") String aiServerUrl,
            @Value("${ai.server.internal-key:}") String internalKey) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
        this.aiServerUrl  = aiServerUrl.replaceAll("/+$", "");
        this.internalKey  = internalKey;

        if (internalKey == null || internalKey.isBlank()) {
            if (!aiServerUrl.contains("localhost") && !aiServerUrl.contains("127.0.0.1")) {
                log.warn("AI_SERVER_INTERNAL_KEY is not configured but AI server is not localhost ({}). " +
                         "All AI requests will be rejected with 403.", aiServerUrl);
            }
        }
        log.info("AiServerClient initialized — url={}, internalKey={}",
                 aiServerUrl,
                 (internalKey != null && !internalKey.isBlank()) ? "***" : "<not set>");
    }

    // ─────────────────────────────────────────────
    // POST /score
    // ─────────────────────────────────────────────

    public AiScoreResponseDTO score(AiScoreRequestDTO request) {
        String url = aiServerUrl + "/score";
        try {
            ResponseEntity<AiScoreResponseDTO> response = restTemplate.exchange(
                    url, HttpMethod.POST, buildJsonEntity(request), AiScoreResponseDTO.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            throw new AiServerUnavailableException(url, e.getMessage());
        } catch (Exception e) {
            log.error("AI /score hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // POST /score/batch
    // ─────────────────────────────────────────────

    public AiBatchScoreResponseDTO scoreBatch(AiBatchScoreRequestDTO request) {
        String url = aiServerUrl + "/score/batch";
        try {
            ResponseEntity<AiBatchScoreResponseDTO> response = restTemplate.exchange(
                    url, HttpMethod.POST, buildJsonEntity(request), AiBatchScoreResponseDTO.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            throw new AiServerUnavailableException(url, e.getMessage());
        } catch (Exception e) {
            log.error("AI /score/batch hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // POST /recommend
    // ─────────────────────────────────────────────

    public AiRecommendResponseDTO recommend(AiRecommendRequestDTO request) {
        String url = aiServerUrl + "/recommend";
        try {
            ResponseEntity<AiRecommendResponseDTO> response = restTemplate.exchange(
                    url, HttpMethod.POST, buildJsonEntity(request), AiRecommendResponseDTO.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            throw new AiServerUnavailableException(url, e.getMessage());
        } catch (Exception e) {
            log.error("AI /recommend hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // POST /explain
    // ─────────────────────────────────────────────

    public AiExplainResponseDTO explain(AiExplainRequestDTO request) {
        String url = aiServerUrl + "/explain";
        try {
            ResponseEntity<AiExplainResponseDTO> response = restTemplate.exchange(
                    url, HttpMethod.POST, buildJsonEntity(request), AiExplainResponseDTO.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            throw new AiServerUnavailableException(url, e.getMessage());
        } catch (Exception e) {
            log.error("AI /explain hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // POST /explain/stream  (Server-Sent Events proxy)
    // ─────────────────────────────────────────────

    /**
     * AI server'dan SSE stream'i okuyup emitter'a iletir.
     * Ayrı thread'de çalıştırılmalıdır (blokleyici okuma içerir).
     */
    public void streamExplain(AiExplainRequestDTO request, SseEmitter emitter) {
        String url = aiServerUrl + "/explain/stream";
        try {
            restTemplate.execute(url, HttpMethod.POST,
                req -> {
                    req.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                    req.getHeaders().set("Accept", "text/event-stream");
                    if (internalKey != null && !internalKey.isBlank()) {
                        req.getHeaders().set("X-Internal-Key", internalKey);
                    }
                    objectMapper.writeValue(req.getBody(), request);
                },
                response -> {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.startsWith("data: ")) {
                                String data = line.substring(6).trim();
                                emitter.send(SseEmitter.event().data(data, MediaType.APPLICATION_JSON));
                            }
                        }
                    }
                    emitter.complete();
                    return null;
                }
            );
        } catch (ResourceAccessException e) {
            log.error("AI /explain/stream ulaşılamıyor: {}", e.getMessage());
            sendErrorAndComplete(emitter, "AI stream service unavailable");
        } catch (Exception e) {
            log.error("AI /explain/stream hatası: {}", e.getMessage());
            sendErrorAndComplete(emitter, "Stream error");
        }
    }

    private void sendErrorAndComplete(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event()
                    .data("{\"type\":\"error\",\"message\":\"" + message + "\"}", MediaType.APPLICATION_JSON));
        } catch (Exception ignored) {}
        emitter.completeWithError(new RuntimeException(message));
    }

    // ─────────────────────────────────────────────
    // GET /health
    // ─────────────────────────────────────────────

    public boolean isHealthy() {
        String url = aiServerUrl + "/health";
        try {
            ResponseEntity<Object> response = restTemplate.getForEntity(url, Object.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("AI server sağlık kontrolü başarısız: {}", e.getMessage());
            return false;
        }
    }

    // ─────────────────────────────────────────────
    // GET /metrics
    // ─────────────────────────────────────────────

    public Object getMetrics() {
        String url = aiServerUrl + "/metrics";
        try {
            ResponseEntity<Object> response = restTemplate.exchange(
                    url, HttpMethod.GET, buildJsonEntity(null), Object.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            throw new AiServerUnavailableException(url, e.getMessage());
        } catch (Exception e) {
            log.error("AI /metrics hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // Yardımcı: JSON HttpEntity oluştur
    // ─────────────────────────────────────────────

    private <T> HttpEntity<T> buildJsonEntity(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (internalKey != null && !internalKey.isBlank()) {
            headers.set("X-Internal-Key", internalKey);
        }
        return new HttpEntity<>(body, headers);
    }
}
