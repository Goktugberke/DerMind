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

import java.util.ArrayList;
import java.util.List;

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
            List<String> userAllergies = (user.getAllergens() != null && !user.getAllergens().isEmpty())
                    ? new ArrayList<>(user.getAllergens())
                    : List.of();

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

    public AiRecommendResponse getRecommendations(AiRecommendRequest request) {
        if (request == null)
            return null;

        String url = "http://localhost:8000/recommend";
        try {
            log.info("Sending recommend request to AI server at: {}", url);
            return restTemplate.postForObject(url, request, AiRecommendResponse.class);
        } catch (Exception e) {
            log.error("Exception occurred while calling AI server /recommend: {}", e.getMessage());
        }
        return null;
    }
}
