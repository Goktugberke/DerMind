package com.dermind.DerMind.address.model;

import com.dermind.DerMind.user.model.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "addresses", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "title"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = "user")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(name = "title", nullable = false, length = 64)
    private String title;

    @NotBlank
    @Column(name = "city", nullable = false, length = 64)
    private String city;

    @NotBlank
    @Column(name = "zip_code", nullable = false, length = 16)
    private String zipCode;

    @NotBlank
    @Column(name = "address_string", nullable = false, length = 512)
    private String addressString;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
