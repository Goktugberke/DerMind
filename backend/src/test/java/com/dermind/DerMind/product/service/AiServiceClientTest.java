package com.dermind.DerMind.product.service;

import com.dermind.DerMind.ai.dto.AiScoreResponseDTO;
import com.dermind.DerMind.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiServiceClientTest {

    @Mock RestTemplate restTemplate;
    @Mock com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    AiServiceClient aiServiceClient;

    @BeforeEach
    void setUp() {
        aiServiceClient = new AiServiceClient(restTemplate, objectMapper);
        ReflectionTestUtils.setField(aiServiceClient, "aiServerUrl", "http://localhost:8000");
        ReflectionTestUtils.setField(aiServiceClient, "internalKey", "");
    }

    private User makeUser(String skinType, boolean hasAcne, java.util.Set<String> allergens) {
        User u = new User();
        u.setId("uid-1");
        u.setSkinType(skinType);
        u.setHasAcne(hasAcne);
        if (allergens != null) u.setAllergens(allergens);
        return u;
    }

    // ── getPersonalScore ─────────────────────────────────────────────────

    @Test
    @DisplayName("getPersonalScore: başarılı yanıt → personalScore döner")
    void getPersonalScore_success_returnsScore() throws Exception {
        AiScoreResponseDTO response = new AiScoreResponseDTO();
        response.setPersonalScore(8.7);

        when(restTemplate.exchange(
                eq("http://localhost:8000/score"),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(String.class)
        )).thenReturn(ResponseEntity.ok("{\"personalScore\": 8.7}"));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(objectMapper.readValue(anyString(), eq(AiScoreResponseDTO.class))).thenReturn(response);

        User user = makeUser("dry", false, null);
        Double result = aiServiceClient.getPersonalScore("P001", user, 0.75);

        assertThat(result).isEqualTo(8.7);
    }

    @Test
    @DisplayName("getPersonalScore: null sephoraProductId → null döner")
    void getPersonalScore_nullProductId_returnsNull() {
        User user = makeUser("oily", false, null);
        assertThat(aiServiceClient.getPersonalScore(null, user, 0.5)).isNull();
    }

    @Test
    @DisplayName("getPersonalScore: null user → null döner")
    void getPersonalScore_nullUser_returnsNull() {
        assertThat(aiServiceClient.getPersonalScore("P001", null, 0.5)).isNull();
    }

    @Test
    @DisplayName("getPersonalScore: AI server ulaşılamaz → null döner (exception swallow)")
    void getPersonalScore_networkError_returnsNull() {
        when(restTemplate.exchange(anyString(), any(), any(), eq(String.class)))
                .thenThrow(new org.springframework.web.client.ResourceAccessException("Connection refused"));

        User user = makeUser("normal", false, null);
        Double result = aiServiceClient.getPersonalScore("P001", user, null);

        assertThat(result).isNull();
    }

    @Test
    @DisplayName("getPersonalScore: AI null body döner → null döner")
    void getPersonalScore_nullBody_returnsNull() {
        when(restTemplate.exchange(anyString(), any(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(null));

        User user = makeUser("normal", true, null);
        assertThat(aiServiceClient.getPersonalScore("P002", user, 0.8)).isNull();
    }

    @Test
    @DisplayName("getPersonalScore: allerjen listesi — virgüllü string parse edilir")
    void getPersonalScore_withAllergens_parsesAndSends() throws Exception {
        AiScoreResponseDTO response = new AiScoreResponseDTO();
        response.setPersonalScore(6.2);

        when(restTemplate.exchange(anyString(), any(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));
        when(objectMapper.readValue(anyString(), eq(AiScoreResponseDTO.class))).thenReturn(response);

        User user = makeUser("sensitive", false, new java.util.LinkedHashSet<>(java.util.Set.of("paraben", "fragrance", "sulfate")));
        Double result = aiServiceClient.getPersonalScore("P003", user, 0.4);

        assertThat(result).isEqualTo(6.2);
    }

    @Test
    @DisplayName("getPersonalScore: null skinType → 'normal' default olarak gönderilir")
    void getPersonalScore_nullSkinType_defaultsToNormal() throws Exception {
        AiScoreResponseDTO response = new AiScoreResponseDTO();
        response.setPersonalScore(7.0);

        when(restTemplate.exchange(anyString(), any(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));
        when(objectMapper.readValue(anyString(), eq(AiScoreResponseDTO.class))).thenReturn(response);

        User user = makeUser(null, false, null);
        Double result = aiServiceClient.getPersonalScore("P004", user, null);

        assertThat(result).isEqualTo(7.0);
    }

    @Test
    @DisplayName("getPersonalScore: internalKey varsa X-Internal-Key header eklenir")
    void getPersonalScore_withInternalKey_addsHeader() throws Exception {
        ReflectionTestUtils.setField(aiServiceClient, "internalKey", "secret-key-123");
        AiScoreResponseDTO response = new AiScoreResponseDTO();
        response.setPersonalScore(9.0);

        when(restTemplate.exchange(anyString(), any(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));
        when(objectMapper.readValue(anyString(), eq(AiScoreResponseDTO.class))).thenReturn(response);

        User user = makeUser("normal", false, null);
        Double result = aiServiceClient.getPersonalScore("P005", user, 1.0);

        assertThat(result).isEqualTo(9.0);
    }

    @Test
    @DisplayName("getPersonalScore: trailing slash URL'den temizlenir")
    void getPersonalScore_trailingSlashUrl_stripsSlash() throws Exception {
        ReflectionTestUtils.setField(aiServiceClient, "aiServerUrl", "http://localhost:8000/");
        AiScoreResponseDTO response = new AiScoreResponseDTO();
        response.setPersonalScore(8.0);

        when(restTemplate.exchange(
                eq("http://localhost:8000/score"),
                any(),
                any(),
                eq(String.class)
        )).thenReturn(ResponseEntity.ok("{}"));
        when(objectMapper.readValue(anyString(), eq(AiScoreResponseDTO.class))).thenReturn(response);

        User user = makeUser("oily", true, null);
        assertThat(aiServiceClient.getPersonalScore("P006", user, 0.6)).isEqualTo(8.0);
    }
}
