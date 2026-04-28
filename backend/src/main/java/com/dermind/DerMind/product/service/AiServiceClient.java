package com.dermind.DerMind.product.service;

import com.dermind.DerMind.ai.dto.AiScoreRequestDTO;
import com.dermind.DerMind.ai.dto.AiScoreResponseDTO;
import com.dermind.DerMind.ai.dto.UserProfileDTO;
import com.dermind.DerMind.user.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Value("${ai.server.internal-key:}")
    private String internalKey;

    public Double getPersonalScore(String sephoraProductId, User user, Double isRecommended) {
        if (sephoraProductId == null || user == null) {
            return null;
        }

        try {
            List<String> userAllergies = Collections.emptyList();
            if (user.getAllergens() != null && !user.getAllergens().isBlank()) {
                userAllergies = Arrays.stream(user.getAllergens().split(","))
                        .map(String::trim)
                        .map(String::toLowerCase)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }

            UserProfileDTO aiProfile = UserProfileDTO.builder()
                    .skinType(user.getSkinType() != null ? user.getSkinType().toLowerCase().trim() : "normal")
                    .hasAcne(user.isHasAcne())
                    .allergies(userAllergies)
                    .build();

            AiScoreRequestDTO request = AiScoreRequestDTO.builder()
                    .sephoraProductId(sephoraProductId)
                    .user(aiProfile)
                    .isRecommended(isRecommended)
                    .build();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (internalKey != null && !internalKey.isBlank()) {
                headers.set("X-Internal-Key", internalKey);
            }
            HttpEntity<AiScoreRequestDTO> entity = new HttpEntity<>(request, headers);

            String scoreUrl = aiServerUrl.replaceAll("/+$", "") + "/score";
            log.debug("AI /score → {} (product={}, skin={}, acne={}, recRate={})",
                    scoreUrl, sephoraProductId, aiProfile.getSkinType(), aiProfile.isHasAcne(), isRecommended);

            ResponseEntity<AiScoreResponseDTO> response = restTemplate.postForEntity(
                    scoreUrl, entity, AiScoreResponseDTO.class);

            AiScoreResponseDTO body = response.getBody();
            if (body != null) {
                return body.getPersonalScore();
            }
            log.warn("AI server null response body for product {}", sephoraProductId);
        } catch (Exception e) {
            log.warn("AI /score call failed for product {}: {}", sephoraProductId, e.getMessage());
        }

        return null;
    }
}
