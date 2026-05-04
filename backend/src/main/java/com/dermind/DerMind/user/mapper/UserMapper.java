package com.dermind.DerMind.user.mapper;

import com.dermind.DerMind.user.dto.UserCreateDto;
import com.dermind.DerMind.user.dto.UserDetailDTO;
import com.dermind.DerMind.user.dto.UserResponseDTO;
import com.dermind.DerMind.user.dto.UserUpdateDto;
import com.dermind.DerMind.user.model.User;
import org.mapstruct.*;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "hasAcne", source = "hasAcne")
    @Mapping(target = "allergens", expression = "java(setToList(user.getAllergens()))")
    UserResponseDTO toResponseDTO(User user);

    @Mapping(target = "allergens", expression = "java(setToList(user.getAllergens()))")
    @Mapping(target = "totalPurchases", expression = "java(user.getPurchases() != null ? user.getPurchases().size() : 0)")
    @Mapping(target = "totalRatings",   expression = "java(user.getRatings() != null ? user.getRatings().size() : 0)")
    @Mapping(target = "activeStreaks",  expression = "java(user.getStreaks() != null ? (int) user.getStreaks().stream().filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0).count() : 0)")
    UserDetailDTO toDetailDTO(User user);

    @Mapping(target = "purchases",  ignore = true)
    @Mapping(target = "ratings",    ignore = true)
    @Mapping(target = "streaks",    ignore = true)
    @Mapping(target = "favorites",  ignore = true)
    @Mapping(target = "provider",   ignore = true)
    @Mapping(target = "providerId", ignore = true)
    @Mapping(target = "allergens",  expression = "java(normalizeAllergenList(dto.getAllergens()))")
    User toEntity(UserCreateDto dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",         ignore = true)
    @Mapping(target = "email",      ignore = true)
    @Mapping(target = "purchases",  ignore = true)
    @Mapping(target = "ratings",    ignore = true)
    @Mapping(target = "streaks",    ignore = true)
    @Mapping(target = "favorites",  ignore = true)
    @Mapping(target = "provider",   ignore = true)
    @Mapping(target = "providerId", ignore = true)
    @Mapping(target = "allergens",  expression = "java(dto.getAllergens() != null ? normalizeAllergenList(dto.getAllergens()) : user.getAllergens())")
    void updateEntity(@MappingTarget User user, UserUpdateDto dto);

    default List<String> setToList(Set<String> set) {
        if (set == null || set.isEmpty()) return List.of();
        return List.copyOf(set);
    }

    default Set<String> normalizeAllergenList(List<String> list) {
        if (list == null || list.isEmpty()) return new LinkedHashSet<>();
        return list.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.trim().toLowerCase())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
