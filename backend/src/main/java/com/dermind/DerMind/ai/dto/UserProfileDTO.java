package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI Server'a gönderilen kullanıcı profili.
 * app.py UserProfile modeli ile birebir eşleşmelidir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {

    @JsonProperty("skin_type")
    private String skinType;          // "dry" | "oily" | "combination" | "normal"

    @JsonProperty("has_acne")
    private boolean hasAcne;          // User.hasAcne alanından gelir

    @JsonProperty("allergies")
    private List<String> allergies;   // User.allergens virgülle ayrılıp listeye çevrilir
}
