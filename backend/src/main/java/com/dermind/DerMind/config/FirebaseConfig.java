package com.dermind.DerMind.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

@Configuration
public class FirebaseConfig {

  @Bean
  public FirebaseApp firebaseApp() throws IOException {
    ClassPathResource serviceAccount = new ClassPathResource("firebase-service-account.json");

    if (!serviceAccount.exists()) {
      throw new IOException("Firebase service account file not found in classpath.");
    }

    FirebaseOptions options = FirebaseOptions.builder()
        .setCredentials(GoogleCredentials.fromStream(serviceAccount.getInputStream()))
        .build();

    if (FirebaseApp.getApps().isEmpty()) {
      return FirebaseApp.initializeApp(options);
    }
    return FirebaseApp.getInstance();
  }
}
