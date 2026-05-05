package com.dermind.DerMind.config;

import com.dermind.DerMind.ai.service.AiServerClient;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * /actuator/health endpoint'ine AI server durumunu ekler.
 * AI server down ise health DOWN ama backend kendi başına UP kalır
 * (OUT_OF_SERVICE level).
 */
@Component
@RequiredArgsConstructor
public class AiServerHealthIndicator implements HealthIndicator {

    private final AiServerClient aiServerClient;

    @Override
    public Health health() {
        boolean healthy = aiServerClient.isHealthy();
        if (healthy) {
            return Health.up()
                    .withDetail("ai_server", "reachable")
                    .build();
        }
        // OUT_OF_SERVICE — backend çalışıyor ama AI features degrade
        return Health.outOfService()
                .withDetail("ai_server", "unreachable")
                .withDetail("note", "AI features will return 503; core endpoints unaffected")
                .build();
    }
}
