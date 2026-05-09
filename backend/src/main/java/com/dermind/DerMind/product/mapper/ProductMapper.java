package com.dermind.DerMind.product.mapper;

import com.dermind.DerMind.product.dto.ProductCreateDTO;
import com.dermind.DerMind.product.dto.ProductDetailDTO;
import com.dermind.DerMind.product.dto.ProductResponseDTO;
import com.dermind.DerMind.product.dto.ProductUpdateDTO;
import com.dermind.DerMind.product.model.Product;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(target = "personalScore", ignore = true)
    @Mapping(source = "price", target = "price")
    @Mapping(source = "hidden", target = "hiddenStatus")
    ProductResponseDTO toResponseDTO(Product product);

    @Mapping(target = "averageUserRating", ignore = true)
    @Mapping(target = "totalRatings", ignore = true)
    @Mapping(target = "totalPurchases", ignore = true)
    @Mapping(target = "personalScore", ignore = true)
    @Mapping(target = "safeIngredientCount", ignore = true)
    @Mapping(target = "cautionIngredientCount", ignore = true)
    @Mapping(target = "riskyIngredientCount", ignore = true)
    @Mapping(source = "price", target = "price")
    ProductDetailDTO toDetailDTO(Product product);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ratings", ignore = true)
    @Mapping(target = "purchases", ignore = true)
    @Mapping(target = "streaks", ignore = true)
    @Mapping(target = "favorites", ignore = true)
    @Mapping(target = "hidden", ignore = true)
    Product toEntity(ProductCreateDTO dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ratings", ignore = true)
    @Mapping(target = "purchases", ignore = true)
    @Mapping(target = "streaks", ignore = true)
    @Mapping(target = "favorites", ignore = true)
    @Mapping(target = "hidden", ignore = true)
    void updateEntity(@MappingTarget Product product, ProductUpdateDTO dto);
}
