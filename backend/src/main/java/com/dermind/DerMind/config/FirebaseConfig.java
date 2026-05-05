package com.dermind.DerMind.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

@Configuration
@Slf4j
public class FirebaseConfig {

  @Bean
  public FirebaseApp firebaseApp() {
    ClassPathResource serviceAccount = new ClassPathResource("firebase-service-account.json");

    if (!serviceAccount.exists()) {
      log.warn("firebase-service-account.json bulunamadı — Firebase auth devre dışı. " +
               "Firebase Console'dan indirip src/main/resources/ altına ekleyin.");
      return null;
    }

    try {
      FirebaseOptions options = FirebaseOptions.builder()
          .setCredentials(GoogleCredentials.fromStream(serviceAccount.getInputStream()))
          .build();

      if (FirebaseApp.getApps().isEmpty()) {
        return FirebaseApp.initializeApp(options);
      }
      return FirebaseApp.getInstance();
    } catch (IOException e) {
      log.error("Firebase başlatılamadı: {}", e.getMessage());
      return null;
    }
  }
}
