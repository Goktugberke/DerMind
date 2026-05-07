package com.dermind.DerMind.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferencesDTO {
    private boolean pushNotificationsEnabled;
    private boolean emailNotificationsEnabled;
    private boolean smsNotificationsEnabled;
}
