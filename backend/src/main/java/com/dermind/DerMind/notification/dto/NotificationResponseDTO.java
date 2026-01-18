package com.dermind.DerMind.notification.dto;

import com.dermind.DerMind.common.enums.NotificationType;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponseDTO {
    private Long id;
    private String title;
    private String message;
    private NotificationType type;
    private Long relatedEntityId;
    private boolean isRead;
    private LocalDateTime createdAt;
}