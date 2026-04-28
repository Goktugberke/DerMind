package com.dermind.DerMind.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Spring Data Web — Page<> serialization stable JSON yapısı için.
 * VIA_DTO mode: PagedModel olarak (content, page metadata) wrap eder.
 * PageImpl direct serialization warning'ini ortadan kaldırır.
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class SpringDataWebConfig {
}
