package com.dermind.DerMind.user_product_rating.dto;

import com.dermind.DerMind.common.enums.UsageDurationUnit;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingCreateDTO {
    /**
     * @deprecated Backend authenticated user'dan alır (IDOR koruması).
     * Body'den gönderilirse görmezden gelinir.
     */
    @Deprecated
    private String userId;

    @NotNull(message = "Product ID boş olamaz")
    private Long productId;

    @NotNull(message = "Puan boş olamaz")
    @Min(value = 1, message = "Puan en az 1 olabilir")
    @Max(value = 10, message = "Puan en fazla 10 olabilir")
    private Integer rating;

    @Size(max = 2000, message = "Yorum en fazla 2000 karakter olabilir")
    private String review;

    private Boolean skinImprovement;
    private Boolean wouldRecommend;

    @Min(value = 0, message = "Kullanım süresi negatif olamaz")
    private Integer usageDuration;

    private UsageDurationUnit usageDurationUnit;

    @Size(max = 1000)
    private String pros;

    @Size(max = 1000)
    private String cons;
}