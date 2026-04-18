package com.dermind.DerMind.ai.controller;

import com.dermind.DerMind.ai.dto.*;
import com.dermind.DerMind.ai.service.AiServerClient;
import com.dermind.DerMind.product.model.Product;
import com.dermind.DerMind.product.repository.ProductRepository;
import com.dermind.DerMind.security.CustomOAuth2UserService;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI Server entegrasyonu için proxy endpoint'ler.
 *
 * Tüm endpoint'ler mevcut kullanıcıyı OAuth2 oturumundan alır.
 * AI server çalışmıyorsa HTTP 503 döner (fallback yoktur — mobilin
 * yerel mantığı devreye girer).
 *
 * Endpoint'ler:
 *   GET  /api/ai/score/{productId}       — XGBoost puanlama
 *   POST /api/ai/recommend               — KNN öneriler
 *   GET  /api/ai/explain/{productId}     — SHAP + LLM açıklama
 *   GET  /api/ai/health                  — AI server sağlık kontrolü
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiServerClient aiServerClient;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CustomOAuth2UserService oauth2UserService;

    // ─────────────────────────────────────────────
    // GET /api/ai/score/{productId}
    // ─────────────────────────────────────────────

    /**
     * Bir ürün için AI tabanlı base_score ve personal_score döner.
     *
     * @param productId Backend veritabanındaki ürün ID'si (Long)
     * @return AiScoreResponseDTO veya 404/503
     */
    @GetMapping("/score/{productId}")
    public ResponseEntity<?> getScore(@PathVariable Long productId) {

        // Ürünü bul
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        if (product.getSephoraProductId() == null || product.getSephoraProductId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bu ürünün Sephora ID'si yok, AI puanı hesaplanamaz."));
        }

        // Mevcut kullanıcıyı bul
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Kimlik doğrulama gerekli."));
        }

        // AI isteği oluştur
        AiScoreRequestDTO request = AiScoreRequestDTO.builder()
                .sephoraProductId(product.getSephoraProductId())
                .user(buildUserProfile(user))
                .build();

        // AI server'a gönder
        AiScoreResponseDTO result = aiServerClient.score(request);
        if (result == null) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI server şu an erişilemiyor. Lütfen daha sonra tekrar deneyin."));
        }

        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────
    // POST /api/ai/recommend
    // ─────────────────────────────────────────────

    /**
     * Kullanıcı profiline göre KNN ürün önerileri döner.
     *
     * @param category          Örn: "Skincare" (opsiyonel)
     * @param secondaryCategory Örn: "Sunscreen" (opsiyonel)
     * @param topK              Kaç öneri isteniyor (varsayılan 5, maks 20)
     */
    @GetMapping("/recommend")
    public ResponseEntity<?> getRecommendations(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String secondaryCategory,
            @RequestParam(defaultValue = "5") int topK) {

        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Kimlik doğrulama gerekli."));
        }

        int clampedTopK = Math.min(Math.max(topK, 1), 20);

        AiRecommendRequestDTO request = AiRecommendRequestDTO.builder()
                .user(buildUserProfile(user))
                .category(category)
                .secondaryCategory(secondaryCategory)
                .topK(clampedTopK)
                .build();

        AiRecommendResponseDTO result = aiServerClient.recommend(request);
        if (result == null) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI server şu an erişilemiyor."));
        }

        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────
    // GET /api/ai/explain/{productId}
    // ─────────────────────────────────────────────

    /**
     * Bir ürünün puanını SHAP + LLM ile açıklar.
     * NOT: Bu endpoint LLM çağrısı yaptığından 5-30 saniye sürebilir.
     *
     * @param productId Backend veritabanındaki ürün ID'si
     * @param language  "tr" (varsayılan) veya "en"
     */
    @GetMapping("/explain/{productId}")
    public ResponseEntity<?> explainScore(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "tr") String language) {

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        if (product.getSephoraProductId() == null || product.getSephoraProductId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bu ürünün Sephora ID'si yok, XAI açıklaması üretilemez."));
        }

        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Kimlik doğrulama gerekli."));
        }

        String lang = "en".equalsIgnoreCase(language) ? "en" : "tr";

        AiExplainRequestDTO request = AiExplainRequestDTO.builder()
                .sephoraProductId(product.getSephoraProductId())
                .user(buildUserProfile(user))
                .language(lang)
                .build();

        AiExplainResponseDTO result = aiServerClient.explain(request);
        if (result == null) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI server şu an erişilemiyor."));
        }

        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────
    // GET /api/ai/health
    // ─────────────────────────────────────────────

    /**
     * AI server'ın çalışıp çalışmadığını döner.
     * Mobil bu endpoint'i başlangıçta kontrol edebilir.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> aiHealth() {
        boolean healthy = aiServerClient.isHealthy();
        return ResponseEntity.ok(Map.of(
                "ai_server_status", healthy ? "UP" : "DOWN",
                "ai_server_url", "http://localhost:8000"
        ));
    }

    // ─────────────────────────────────────────────
    // Yardımcı metodlar
    // ─────────────────────────────────────────────

    /**
     * OAuth2 oturumundaki kullanıcıyı veritabanından getirir.
     * Oturum yoksa veya kullanıcı bulunamazsa null döner.
     */
    private User getCurrentUser() {
        try {
            String userId = oauth2UserService.currentUserId();
            return userRepository.findById(userId).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * User entity'sini AI server'ın beklediği UserProfileDTO'ya dönüştürür.
     *
     * Dönüşüm kuralları:
     *   skinType  → küçük harfe indirilir (örn. "Dry" → "dry")
     *   allergens → virgülle ayrılıp listeye çevrilir (örn. "Fragrance,Alcohol" → ["fragrance","alcohol"])
     *   hasAcne   → User.isHasAcne() değerinden gelir
     */
    private UserProfileDTO buildUserProfile(User user) {
        String skinType = user.getSkinType() != null
                ? user.getSkinType().toLowerCase().trim()
                : "normal";

        List<String> allergies = Collections.emptyList();
        if (user.getAllergens() != null && !user.getAllergens().isBlank()) {
            allergies = Arrays.stream(user.getAllergens().split(","))
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }

        return UserProfileDTO.builder()
                .skinType(skinType)
                .hasAcne(user.isHasAcne())
                .allergies(allergies)
                .build();
    }
}
