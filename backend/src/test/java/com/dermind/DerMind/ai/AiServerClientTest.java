package com.dermind.DerMind.ai;

import com.dermind.DerMind.ai.dto.*;
import com.dermind.DerMind.ai.service.AiServerClient;
import com.dermind.DerMind.error.AiServerUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiServerClientTest {

    @Mock RestTemplate restTemplate;

    AiServerClient client;

    @BeforeEach
    void setUp() {
        client = new AiServerClient(restTemplate, "http://localhost:8000", "");
    }

    // ── /score ─────────────────────────────────────────────────────────

    @Test
    void score_successfulResponse_returnsDto() {
        AiScoreResponseDTO expected = new AiScoreResponseDTO();
        expected.setProductId("P123");
        expected.setBaseScore(7.5);
        expected.setPersonalScore(8.2);

        when(restTemplate.exchange(
                eq("http://localhost:8000/score"),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(AiScoreResponseDTO.class)
        )).thenReturn(ResponseEntity.ok(expected));

        AiScoreResponseDTO result = client.score(
                AiScoreRequestDTO.builder()
                        .sephoraProductId("P123")
                        .user(UserProfileDTO.builder()
                                .skinType("dry")
                                .hasAcne(false)
                                .allergies(List.of())
                                .build())
                        .build()
        );

        assertThat(result).isNotNull();
        assertThat(result.getProductId()).isEqualTo("P123");
        assertThat(result.getPersonalScore()).isEqualTo(8.2);
    }

    @Test
    void score_aiServerUnreachable_throwsAiServerUnavailableException() {
        when(restTemplate.exchange(anyString(), any(), any(), eq(AiScoreResponseDTO.class)))
                .thenThrow(new ResourceAccessException("Connection refused"));

        AiScoreRequestDTO request = AiScoreRequestDTO.builder()
                .sephoraProductId("P123")
                .user(UserProfileDTO.builder().skinType("normal").allergies(List.of()).build())
                .build();

        assertThatThrownBy(() -> client.score(request))
                .isInstanceOf(AiServerUnavailableException.class);
    }

    // ── /recommend ─────────────────────────────────────────────────────

    @Test
    void recommend_successfulResponse_returnsDto() {
        AiRecommendResponseDTO expected = new AiRecommendResponseDTO();

        when(restTemplate.exchange(
                eq("http://localhost:8000/recommend"),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(AiRecommendResponseDTO.class)
        )).thenReturn(ResponseEntity.ok(expected));

        AiRecommendResponseDTO result = client.recommend(
                AiRecommendRequestDTO.builder()
                        .user(UserProfileDTO.builder().skinType("oily").allergies(List.of()).build())
                        .topK(5)
                        .build()
        );

        assertThat(result).isNotNull();
    }

    @Test
    void recommend_aiServerUnreachable_throwsAiServerUnavailableException() {
        when(restTemplate.exchange(anyString(), any(), any(), eq(AiRecommendResponseDTO.class)))
                .thenThrow(new ResourceAccessException("Connection refused"));

        AiRecommendRequestDTO request = AiRecommendRequestDTO.builder()
                .user(UserProfileDTO.builder().skinType("oily").allergies(List.of()).build())
                .build();

        assertThatThrownBy(() -> client.recommend(request))
                .isInstanceOf(AiServerUnavailableException.class);
    }

    // ── /health ────────────────────────────────────────────────────────

    @Test
    void isHealthy_serverResponds2xx_returnsTrue() {
        when(restTemplate.getForEntity("http://localhost:8000/health", Object.class))
                .thenReturn(ResponseEntity.ok(null));

        assertThat(client.isHealthy()).isTrue();
    }

    @Test
    void isHealthy_serverThrows_returnsFalse() {
        when(restTemplate.getForEntity(anyString(), eq(Object.class)))
                .thenThrow(new ResourceAccessException("timeout"));

        assertThat(client.isHealthy()).isFalse();
    }

    @Test
    void isHealthy_server503_returnsFalse() {
        when(restTemplate.getForEntity("http://localhost:8000/health", Object.class))
                .thenReturn(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build());

        assertThat(client.isHealthy()).isFalse();
    }
}
