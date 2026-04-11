package com.dermind.DerMind.product.service;

import com.dermind.DerMind.product.dto.ai.AiScoreRequest;
import com.dermind.DerMind.product.dto.ai.AiScoreResponse;
import com.dermind.DerMind.product.dto.ai.AiUserProfile;
import com.dermind.DerMind.user.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceClient {

    private final RestTemplate restTemplate;
    private final String AI_SERVER_URL = "http://localhost:8000/score";

    public Double getPersonalScore(String sephoraProductId, User user) {
        if (sephoraProductId == null || user == null) {
            return null;
        }

        try {
            log.info("Preparing AI score request for product: {} and user skin type: {}", sephoraProductId, user.getSkinType());
            List<String> userAllergies = Collections.emptyList();
            if (user.getAllergens() != null && !user.getAllergens().isBlank()) {
                userAllergies = Arrays.asList(user.getAllergens().split(","));
            }

            AiUserProfile aiProfile = AiUserProfile.builder()
                    .skin_type(user.getSkinType() != null ? user.getSkinType().toLowerCase() : "normal")
                    .has_acne(false)
                    .allergies(userAllergies)
                    .build();

            AiScoreRequest request = AiScoreRequest.builder()
                    .sephora_product_id(sephoraProductId)
                    .user(aiProfile)
                    .build();

            log.info("Sending request to AI server at: {}", AI_SERVER_URL);
            AiScoreResponse response = restTemplate.postForObject(AI_SERVER_URL, request, AiScoreResponse.class);

            if (response != null) {
                log.info("AI server response received. Personal score: {}", response.getPersonal_score());
                return response.getPersonal_score();
            } else {
                log.error("AI server returned null response body");
            }
        } catch (Exception e) {
            log.error("Exception occurred while calling AI server: {}. StackTrace: {}", e.getMessage(), e.getStackTrace()[0]);
        }

        return null;
    }
}
