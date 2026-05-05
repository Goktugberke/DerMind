package com.dermind.DerMind.common.model;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Audit trail için base entity. Yeni entity'ler bunu extend ederse
 * createdAt/createdBy/updatedAt/updatedBy alanları otomatik doldurulur.
 *
 * Mevcut entity'ler @CreationTimestamp/@UpdateTimestamp kullanıyor;
 * gelecek entity'ler bu pattern'i tercih etmeli.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class AuditableEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 255)
    private String createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by", length = 255)
    private String updatedBy;
}
