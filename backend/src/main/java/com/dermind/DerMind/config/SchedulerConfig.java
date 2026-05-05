package com.dermind.DerMind.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * ShedLock — distributed lock for @Scheduled jobs.
 * Multi-instance deployment'ta aynı job'ın iki kez çalışmasını engeller.
 *
 * Kullanım:
 *   @Scheduled(...)
 *   @SchedulerLock(name = "morningReminders", lockAtMostFor = "5m", lockAtLeastFor = "30s")
 */
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "10m")
public class SchedulerConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new org.springframework.jdbc.core.JdbcTemplate(dataSource))
                        .usingDbTime()
                        .build()
        );
    }
}
