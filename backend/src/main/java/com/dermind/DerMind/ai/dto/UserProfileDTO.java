package com.dermind.DerMind.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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

    @NotBlank(message = "Cilt tipi boş olamaz")
    @Pattern(regexp = "^(dry|oily|combination|normal|sensitive)$",
             message = "Cilt tipi dry, oily, combination, normal veya sensitive olmalıdır")
    @JsonProperty("skin_type")
    private String skinType;

    @JsonProperty("has_acne")
    private boolean hasAcne;

    @JsonProperty("allergies")
    private List<String> allergies;
}
