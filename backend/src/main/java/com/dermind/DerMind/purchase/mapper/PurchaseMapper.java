package com.dermind.DerMind.purchase.mapper;

import com.dermind.DerMind.purchase.dto.PurchaseDetailDTO;
import com.dermind.DerMind.purchase.dto.PurchaseResponseDTO;
import com.dermind.DerMind.purchase.model.Purchase;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PurchaseMapper {

    @Mapping(target = "userId",      source = "user.id")
    @Mapping(target = "userName",    source = "user.name")
    @Mapping(target = "productId",   source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "productBrand",source = "product.brand")
    PurchaseResponseDTO toResponseDTO(Purchase purchase);

    @Mapping(target = "userId",              source = "user.id")
    @Mapping(target = "userName",            source = "user.name")
    @Mapping(target = "userEmail",           source = "user.email")
    @Mapping(target = "productId",           source = "product.id")
    @Mapping(target = "productName",         source = "product.name")
    @Mapping(target = "productBrand",        source = "product.brand")
    @Mapping(target = "productIngredients",  source = "product.ingredients")
    @Mapping(target = "productQualityScore", source = "product.qualityScore")
    PurchaseDetailDTO toDetailDTO(Purchase purchase);
}
