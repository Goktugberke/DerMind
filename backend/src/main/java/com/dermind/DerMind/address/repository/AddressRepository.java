package com.dermind.DerMind.address.repository;

import com.dermind.DerMind.address.model.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByUserIdOrderByIsDefaultDescCreatedAtDesc(String userId);

    Optional<Address> findByIdAndUserId(Long id, String userId);

    Optional<Address> findByUserIdAndTitle(String userId, String title);

    long countByUserId(String userId);

    @Modifying
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.user.id = :userId AND a.id != :excludeAddressId")
    void unsetDefaultForUserExcept(@Param("userId") String userId, @Param("excludeAddressId") Long excludeAddressId);

    @Modifying
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.user.id = :userId")
    void unsetAllDefaultForUser(@Param("userId") String userId);

    Optional<Address> findFirstByUserIdAndIsDefaultFalseOrderByCreatedAtAsc(String userId);
}
