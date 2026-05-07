package com.dermind.DerMind.product.service;

import com.dermind.DerMind.ai.dto.AiScoreRequestDTO;
import com.dermind.DerMind.ai.dto.AiScoreResponseDTO;
import com.dermind.DerMind.ai.dto.UserProfileDTO;
import com.dermind.DerMind.user.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceClient {

    private static final Set<String> VALID_SKIN_TYPES = Set.of("dry", "oily", "combination", "normal");

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Value("${ai.server.internal-key:}")
    private String internalKey;

    public Double getPersonalScore(String sephoraProductId, User user, Double isRecommended) {
        if (sephoraProductId == null || user == null) {
            return null;
        }

        try {
            List<String> userAllergies = (user.getAllergens() != null && !user.getAllergens().isEmpty())
                    ? new ArrayList<>(user.getAllergens())
                    : List.of();

            String raw = user.getSkinType() != null ? user.getSkinType().toLowerCase().trim() : "";
            String skinType = VALID_SKIN_TYPES.contains(raw) ? raw : "normal";

            UserProfileDTO aiProfile = UserProfileDTO.builder()
                    .skinType(skinType)
                    .hasAcne(user.isHasAcne())
                    .allergies(userAllergies)
                    .build();

            AiScoreRequestDTO request = AiScoreRequestDTO.builder()
                    .sephoraProductId(sephoraProductId)
                    .user(aiProfile)
                    .isRecommended(isRecommended)
                    .build();

            String json = objectMapper.writeValueAsString(request);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (internalKey != null && !internalKey.isBlank()) {
                headers.set("X-Internal-Key", internalKey);
            }
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            String scoreUrl = aiServerUrl.replaceAll("/+$", "") + "/score";
            ResponseEntity<String> response = restTemplate.exchange(
                    scoreUrl, HttpMethod.POST, entity, String.class);

            if (response.getBody() != null) {
                AiScoreResponseDTO body = objectMapper.readValue(response.getBody(), AiScoreResponseDTO.class);
                return body.getPersonalScore();
            }
        } catch (Exception e) {
            log.warn("AI /score call failed: {}", e.getMessage());
        }
        return null;
    }

    public java.util.Map<String, Double> getBatchScores(List<String> sephoraProductIds, User user) {
        if (sephoraProductIds == null || sephoraProductIds.isEmpty() || user == null) {
            return java.util.Collections.emptyMap();
        }

        try {
            List<String> userAllergies = (user.getAllergens() != null && !user.getAllergens().isEmpty())
                    ? new ArrayList<>(user.getAllergens())
                    : List.of();

            String raw = user.getSkinType() != null ? user.getSkinType().toLowerCase().trim() : "";
            String skinType = VALID_SKIN_TYPES.contains(raw) ? raw : "normal";

            UserProfileDTO aiProfile = UserProfileDTO.builder()
                    .skinType(skinType)
                    .hasAcne(user.isHasAcne())
                    .allergies(userAllergies)
                    .build();

            com.dermind.DerMind.ai.dto.AiBatchScoreRequestDTO request = com.dermind.DerMind.ai.dto.AiBatchScoreRequestDTO.builder()
                    .sephoraProductIds(sephoraProductIds)
                    .user(aiProfile)
                    .build();

            String json = objectMapper.writeValueAsString(request);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (internalKey != null && !internalKey.isBlank()) {
                headers.set("X-Internal-Key", internalKey);
            }
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            String batchUrl = aiServerUrl.replaceAll("/+$", "") + "/score/batch";
            ResponseEntity<String> response = restTemplate.exchange(
                    batchUrl, HttpMethod.POST, entity, String.class);

            if (response.getBody() != null) {
                com.dermind.DerMind.ai.dto.AiBatchScoreResponseDTO body = objectMapper.readValue(
                        response.getBody(), com.dermind.DerMind.ai.dto.AiBatchScoreResponseDTO.class);
                
                java.util.Map<String, Double> scores = new java.util.HashMap<>();
                if (body.getResults() != null) {
                    for (var result : body.getResults()) {
                        scores.put(result.getProductId(), result.getPersonalScore());
                    }
                }
                return scores;
            }
        } catch (Exception e) {
            log.warn("AI /score/batch call failed: {}", e.getMessage());
        }
        return java.util.Collections.emptyMap();
    }
}
