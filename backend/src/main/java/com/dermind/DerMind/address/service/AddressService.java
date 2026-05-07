package com.dermind.DerMind.address.service;

import com.dermind.DerMind.address.dto.AddressDTO;
import com.dermind.DerMind.address.dto.CreateAddressRequest;
import com.dermind.DerMind.address.dto.UpdateAddressRequest;
import com.dermind.DerMind.address.model.Address;
import com.dermind.DerMind.address.repository.AddressRepository;
import com.dermind.DerMind.user.model.User;
import com.dermind.DerMind.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public List<AddressDTO> getUserAddresses(String userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AddressDTO createAddress(String userId, CreateAddressRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (addressRepository.findByUserIdAndTitle(userId, request.getTitle()).isPresent()) {
            throw new IllegalArgumentException("Address title must be unique");
        }

        long addressCount = addressRepository.countByUserId(userId);
        boolean isDefault = request.isDefault() || addressCount == 0;

        Address address = Address.builder()
                .user(user)
                .title(request.getTitle())
                .city(request.getCity())
                .zipCode(request.getZipCode())
                .addressString(request.getAddressString())
                .isDefault(isDefault)
                .build();

        Address savedAddress = addressRepository.save(address);

        if (isDefault && addressCount > 0) {
            addressRepository.unsetDefaultForUserExcept(userId, savedAddress.getId());
        }

        return mapToDTO(savedAddress);
    }

    @Transactional
    public AddressDTO updateAddress(String userId, Long addressId, UpdateAddressRequest request) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found"));

        if (!address.getTitle().equals(request.getTitle())) {
            if (addressRepository.findByUserIdAndTitle(userId, request.getTitle()).isPresent()) {
                throw new IllegalArgumentException("Address title must be unique");
            }
        }

        address.setTitle(request.getTitle());
        address.setCity(request.getCity());
        address.setZipCode(request.getZipCode());
        address.setAddressString(request.getAddressString());
        
        boolean wasDefault = address.isDefault();
        boolean becomesDefault = request.isDefault();
        
        // If it was the only default, we probably shouldn't let them unset it unless there's another.
        // But for simplicity, if they set it to default:
        if (becomesDefault && !wasDefault) {
            address.setDefault(true);
            addressRepository.unsetDefaultForUserExcept(userId, address.getId());
        } else if (!becomesDefault && wasDefault) {
            // Cannot unset default directly if it's the only one, or we just let it happen and pick another?
            // Usually you set another address as default instead of unsetting.
            // But let's handle it by picking another one if available.
            address.setDefault(false);
            addressRepository.saveAndFlush(address); // save current state
            
            addressRepository.findFirstByUserIdAndIsDefaultFalseOrderByCreatedAtAsc(userId)
                    .ifPresent(otherAddress -> {
                        otherAddress.setDefault(true);
                        addressRepository.save(otherAddress);
                    });
        }

        return mapToDTO(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(String userId, Long addressId) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found"));

        boolean wasDefault = address.isDefault();
        addressRepository.delete(address);

        if (wasDefault) {
            addressRepository.findFirstByUserIdAndIsDefaultFalseOrderByCreatedAtAsc(userId)
                    .ifPresent(otherAddress -> {
                        otherAddress.setDefault(true);
                        addressRepository.save(otherAddress);
                    });
        }
    }

    @Transactional
    public void setDefaultAddress(String userId, Long addressId) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found"));

        address.setDefault(true);
        addressRepository.save(address);
        addressRepository.unsetDefaultForUserExcept(userId, address.getId());
    }

    private AddressDTO mapToDTO(Address address) {
        return AddressDTO.builder()
                .id(address.getId())
                .title(address.getTitle())
                .city(address.getCity())
                .zipCode(address.getZipCode())
                .addressString(address.getAddressString())
                .isDefault(address.isDefault())
                .createdAt(address.getCreatedAt())
                .build();
    }
}
