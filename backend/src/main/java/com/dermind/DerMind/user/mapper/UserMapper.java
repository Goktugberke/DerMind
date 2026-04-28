package com.dermind.DerMind.user.mapper;

import com.dermind.DerMind.user.dto.UserCreateDto;
import com.dermind.DerMind.user.dto.UserDetailDTO;
import com.dermind.DerMind.user.dto.UserResponseDTO;
import com.dermind.DerMind.user.dto.UserUpdateDto;
import com.dermind.DerMind.user.model.User;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "hasAcne", source = "hasAcne")
    UserResponseDTO toResponseDTO(User user);

    @Mapping(target = "totalPurchases", expression = "java(user.getPurchases() != null ? user.getPurchases().size() : 0)")
    @Mapping(target = "totalRatings",   expression = "java(user.getRatings() != null ? user.getRatings().size() : 0)")
    @Mapping(target = "activeStreaks",  expression = "java(user.getStreaks() != null ? (int) user.getStreaks().stream().filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0).count() : 0)")
    UserDetailDTO toDetailDTO(User user);

    @Mapping(target = "purchases", ignore = true)
    @Mapping(target = "ratings",   ignore = true)
    @Mapping(target = "streaks",   ignore = true)
    @Mapping(target = "favorites", ignore = true)
    @Mapping(target = "provider",  ignore = true)
    @Mapping(target = "providerId", ignore = true)
    User toEntity(UserCreateDto dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "purchases", ignore = true)
    @Mapping(target = "ratings",   ignore = true)
    @Mapping(target = "streaks",   ignore = true)
    @Mapping(target = "favorites", ignore = true)
    @Mapping(target = "provider",  ignore = true)
    @Mapping(target = "providerId", ignore = true)
    void updateEntity(@MappingTarget User user, UserUpdateDto dto);
}
