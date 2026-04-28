package com.dermind.DerMind.user_product_rating.mapper;

import com.dermind.DerMind.user_product_rating.dto.RatingResponseDTO;
import com.dermind.DerMind.user_product_rating.model.UserProductRating;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RatingMapper {

    @Mapping(target = "userId",       source = "user.id")
    @Mapping(target = "userName",     source = "user.name")
    @Mapping(target = "productId",    source = "product.id")
    @Mapping(target = "productName",  source = "product.name")
    @Mapping(target = "productBrand", source = "product.brand")
    RatingResponseDTO toResponseDTO(UserProductRating rating);
}
