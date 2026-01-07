package com.dermind.DerMind.user_product_rating.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingUpdateDTO {
    private Integer rating;
    private String review;
    private Boolean skinImprovement;
    private Boolean wouldRecommend;
    private Integer usageDuration;
    private String usageDurationUnit;
    private String pros;
    private String cons;
}