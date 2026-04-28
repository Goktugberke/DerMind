package com.dermind.DerMind.user_product_rating.dto;

import com.dermind.DerMind.common.enums.UsageDurationUnit;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingUpdateDTO {

    @Min(value = 1, message = "Puan en az 1 olabilir")
    @Max(value = 10, message = "Puan en fazla 10 olabilir")
    private Integer rating;

    @Size(max = 2000)
    private String review;

    private Boolean skinImprovement;
    private Boolean wouldRecommend;

    @Min(value = 0)
    private Integer usageDuration;

    private UsageDurationUnit usageDurationUnit;

    @Size(max = 1000)
    private String pros;

    @Size(max = 1000)
    private String cons;
}
