package com.dermind.DerMind.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class AppConfig {

    /**
     * Default RestTemplate — kısa timeout (3sn connect, 10sn read) genel HTTP istekleri için.
     */
    @Bean
    @Primary
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(3))
                .readTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * AI server'a özel RestTemplate — /explain LLM çağrısı 30sn'ye kadar sürebilir.
     * Tek doğru kaynak, RestTemplateConfig kaldırıldı.
     */
    @Bean(name = "aiRestTemplate")
    public RestTemplate aiRestTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(3))
                .readTimeout(Duration.ofSeconds(45))
                .build();
    }
}
