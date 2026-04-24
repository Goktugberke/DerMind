package com.dermind.DerMind.ai.service;

import com.dermind.DerMind.ai.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

/**
 * AI Server (FastAPI @ port 8000) ile iletişim kuran HTTP istemcisi.
 *
 * Endpoints:
 *   POST /score      — Kişiselleştirilmiş ürün puanı
 *   POST /recommend  — KNN ürün önerisi
 *   POST /explain    — SHAP XAI + LLM açıklaması
 *   GET  /health     — Sunucu sağlık kontrolü
 */
@Slf4j
@Service
public class AiServerClient {

    private final RestTemplate restTemplate;
    private final String aiServerUrl;

    public AiServerClient(
            @Qualifier("aiRestTemplate") RestTemplate restTemplate,
            @Value("${ai.server.url:http://localhost:8000}") String aiServerUrl) {
        this.restTemplate = restTemplate;
        this.aiServerUrl = aiServerUrl;
    }

    // ─────────────────────────────────────────────
    // POST /score
    // ─────────────────────────────────────────────

    /**
     * Bir ürün için base_score ve personal_score döner.
     * AI server çalışmıyorsa null döner (fallback için kontrol et).
     */
    public AiScoreResponseDTO score(AiScoreRequestDTO request) {
        String url = aiServerUrl + "/score";
        try {
            ResponseEntity<AiScoreResponseDTO> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    buildJsonEntity(request),
                    AiScoreResponseDTO.class
            );
            return response.getBody();
        } catch (ResourceAccessException e) {
            log.warn("AI server ulaşılamıyor ({}): {}", url, e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("AI /score hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // POST /recommend
    // ─────────────────────────────────────────────

    /**
     * Kullanıcı profiline göre KNN ürün önerileri döner.
     */
    public AiRecommendResponseDTO recommend(AiRecommendRequestDTO request) {
        String url = aiServerUrl + "/recommend";
        try {
            ResponseEntity<AiRecommendResponseDTO> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    buildJsonEntity(request),
                    AiRecommendResponseDTO.class
            );
            return response.getBody();
        } catch (ResourceAccessException e) {
            log.warn("AI server ulaşılamıyor ({}): {}", url, e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("AI /recommend hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // POST /explain
    // ─────────────────────────────────────────────

    /**
     * SHAP değerleri + LLM açıklaması döner.
     * Bu endpoint LLM çağrısı yaptığı için yavaş olabilir (5-30sn).
     */
    public AiExplainResponseDTO explain(AiExplainRequestDTO request) {
        String url = aiServerUrl + "/explain";
        try {
            ResponseEntity<AiExplainResponseDTO> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    buildJsonEntity(request),
                    AiExplainResponseDTO.class
            );
            return response.getBody();
        } catch (ResourceAccessException e) {
            log.warn("AI server ulaşılamıyor ({}): {}", url, e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("AI /explain hatası: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // GET /health
    // ─────────────────────────────────────────────

    /**
     * AI server'ın ayakta olup olmadığını kontrol eder.
     * true → sağlıklı, false → erişilemiyor veya hatalı.
     */
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
    // Yardımcı: JSON HttpEntity oluştur
    // ─────────────────────────────────────────────

    private <T> HttpEntity<T> buildJsonEntity(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }
}
