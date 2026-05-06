package com.dermind.DerMind.ai.controller;

import com.dermind.DerMind.ai.dto.*;
import com.dermind.DerMind.ai.service.AiServerClient;
import com.dermind.DerMind.error.BusinessException;
import com.dermind.DerMind.error.ResourceNotFoundException;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user_product_rating.repository.UserProductRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * AI Server proxy. Mobile/frontend AI server'a doğrudan erişemez;
 * her istek backend'in @CurrentUser ile authenticate edilmiş kullanıcısı
 * üzerinden geçer.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Validated
public class AiController {

    private final AiServerClient aiServerClient;
    private final ProductRepository productRepository;
    private final UserProductRatingRepository ratingRepository;
    private final com.dermind.DerMind.user.repository.UserRepository userRepository;

    @Value("${ai.server.url}")
    private String aiServerUrl;

    // ── GET /api/ai/score/{productId} ──────────────────────────────────────

    @GetMapping("/score/{productId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiScoreResponseDTO> getScore(
            @CurrentUser User user,
            @PathVariable Long productId) {

        Product product = resolveProduct(productId);
        Double recommendRate = ratingRepository.getRecommendRateByProductId(productId);

        AiScoreRequestDTO request = AiScoreRequestDTO.builder()
                .sephoraProductId(product.getSephoraProductId())
                .user(buildUserProfile(getFreshUser(user)))
                .isRecommended(recommendRate)
                .build();

        return ResponseEntity.ok(aiServerClient.score(request));
    }

    // ── POST /api/ai/score/batch ───────────────────────────────────────────

    @PostMapping("/score/batch")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiBatchScoreResponseDTO> scoreBatch(
            @CurrentUser User user,
            @Valid @RequestBody AiBatchScoreRequestDTO request) {

        // Override user profile with the authenticated user
        AiBatchScoreRequestDTO secured = AiBatchScoreRequestDTO.builder()
                .sephoraProductIds(request.getSephoraProductIds())
                .user(buildUserProfile(getFreshUser(user)))
                .isRecommended(request.getIsRecommended())
                .build();

        return ResponseEntity.ok(aiServerClient.scoreBatch(secured));
    }

    // ── GET /api/ai/recommend ─────────────────────────────────────────────

    @GetMapping("/recommend")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiRecommendResponseDTO> getRecommendations(
            @CurrentUser User user,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String secondaryCategory,
            @RequestParam(defaultValue = "5") int topK) {

        int clampedTopK = Math.min(Math.max(topK, 1), 20);
        AiRecommendRequestDTO request = AiRecommendRequestDTO.builder()
                .user(buildUserProfile(getFreshUser(user)))
                .category(category)
                .secondaryCategory(secondaryCategory)
                .topK(clampedTopK)
                .build();

        AiRecommendResponseDTO response = aiServerClient.recommend(request);
        return ResponseEntity.ok(mapRecommendations(response));
    }

    // ── GET /api/ai/similar/{productId} ───────────────────────────────────

    @GetMapping("/similar/{productId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiRecommendResponseDTO> getSimilarProducts(
            @CurrentUser User user,
            @PathVariable Long productId) {

        Product product = resolveProduct(productId);
        AiScoreRequestDTO request = AiScoreRequestDTO.builder()
                .sephoraProductId(product.getSephoraProductId())
                .user(buildUserProfile(getFreshUser(user)))
                .build();

        AiRecommendResponseDTO response = aiServerClient.similar(request);
        return ResponseEntity.ok(mapRecommendations(response));
    }

    // ── GET /api/ai/explain/{productId} ──────────────────────────────────

    @GetMapping("/explain/{productId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiExplainResponseDTO> explainScore(
            @CurrentUser User user,
            @PathVariable Long productId,
            @RequestParam(defaultValue = "tr") String language) {

        Product product = resolveProduct(productId);
        Double recommendRate = ratingRepository.getRecommendRateByProductId(productId);

        String lang = "en".equalsIgnoreCase(language) ? "en" : "tr";
        AiExplainRequestDTO request = AiExplainRequestDTO.builder()
                .sephoraProductId(product.getSephoraProductId())
                .user(buildUserProfile(getFreshUser(user)))
                .language(lang)
                .isRecommended(recommendRate)
                .build();

        AiExplainResponseDTO result = aiServerClient.explain(request);
        if (result == null) {
            return ResponseEntity.status(503).build();
        }
        return ResponseEntity.ok(result);
    }

    // ── GET /api/ai/explain/{productId}/stream (SSE) ─────────────────────

    @GetMapping(value = "/explain/{productId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter explainStream(
            @CurrentUser User user,
            @PathVariable Long productId,
            @RequestParam(defaultValue = "tr") String language) {

        Product product = resolveProduct(productId);
        Double recommendRate = ratingRepository.getRecommendRateByProductId(productId);

        String lang = "en".equalsIgnoreCase(language) ? "en" : "tr";
        AiExplainRequestDTO request = AiExplainRequestDTO.builder()
                .sephoraProductId(product.getSephoraProductId())
                .user(buildUserProfile(getFreshUser(user)))
                .language(lang)
                .isRecommended(recommendRate)
                .build();

        SseEmitter emitter = new SseEmitter(60_000L);
        CompletableFuture.runAsync(() -> aiServerClient.streamExplain(request, emitter));
        return emitter;
    }

    // ── GET /api/ai/health ────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> aiHealth() {
        boolean healthy = aiServerClient.isHealthy();
        return ResponseEntity.ok(Map.of(
                "ai_server_status", healthy ? "UP" : "DOWN",
                "ai_server_url", aiServerUrl));
    }

    // ── GET /api/ai/metrics ───────────────────────────────────────────────

    @GetMapping("/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Object> aiMetrics() {
        Object metrics = aiServerClient.getMetrics();
        if (metrics == null) {
            return ResponseEntity.status(503).body(Map.of("error", "AI server unavailable"));
        }
        return ResponseEntity.ok(metrics);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Product resolveProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        if (product.getSephoraProductId() == null || product.getSephoraProductId().isBlank()) {
            throw new BusinessException("Bu ürünün Sephora ID'si yok, AI puanı hesaplanamaz.");
        }
        return product;
    }

    private AiRecommendResponseDTO mapRecommendations(AiRecommendResponseDTO response) {
        if (response == null || response.getRecommendations() == null) {
            return response;
        }

        List<AiRecommendItemDTO> mappedItems = new ArrayList<>();
        for (AiRecommendItemDTO item : response.getRecommendations()) {
            productRepository.findBySephoraProductId(item.getProductId()).ifPresentOrElse(p -> {
                item.setProductId(p.getId().toString());
                if (p.getPrice() != null) item.setPriceUsd(p.getPrice());
                if (p.getName() != null) item.setProductName(p.getName());
                if (p.getBrand() != null) item.setBrand(p.getBrand());
                
                // Use DB qualityScore (0-10)
                if (p.getQualityScore() != null) {
                    item.setBaseScore(p.getQualityScore());
                    item.setRating(p.getQualityScore());
                } else {
                    // Fallback: multiply AI score (0-5) by 2
                    if (item.getBaseScore() != null) item.setBaseScore(item.getBaseScore() * 2);
                    if (item.getRating() != null) item.setRating(item.getRating() * 2);
                }
            }, () -> {
                // Not in DB: just normalize AI scores (0-5 -> 0-10)
                if (item.getBaseScore() != null) item.setBaseScore(item.getBaseScore() * 2);
                if (item.getRating() != null) item.setRating(item.getRating() * 2);
            });
            mappedItems.add(item);
        }
        response.setRecommendations(mappedItems);
        return response;
    }

    private User getFreshUser(User user) {
        return userRepository.findById(user.getId())
                .orElse(user);
    }

    private UserProfileDTO buildUserProfile(User user) {
        String skinType = (user.getSkinType() != null && !user.getSkinType().isBlank())
                ? user.getSkinType().toLowerCase().trim()
                : "normal";

        List<String> allergies = (user.getAllergens() != null && !user.getAllergens().isEmpty())
                ? new ArrayList<>(user.getAllergens())
                : List.of();
        return UserProfileDTO.builder()
                .skinType(skinType)
                .hasAcne(user.isHasAcne())
                .allergies(allergies)
                .build();
    }
}
