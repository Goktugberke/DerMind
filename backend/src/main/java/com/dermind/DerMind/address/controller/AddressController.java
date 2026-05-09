package com.dermind.DerMind.address.controller;

import com.dermind.DerMind.address.dto.AddressDTO;
import com.dermind.DerMind.address.dto.CreateAddressRequest;
import com.dermind.DerMind.address.dto.UpdateAddressRequest;
import com.dermind.DerMind.address.service.AddressService;
import com.dermind.DerMind.security.CurrentUser;
import com.dermind.DerMind.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ResponseEntity<List<AddressDTO>> getUserAddresses(@CurrentUser User user) {
        return ResponseEntity.ok(addressService.getUserAddresses(user.getId()));
    }

    @PostMapping
    public ResponseEntity<AddressDTO> createAddress(@CurrentUser User user, @Valid @RequestBody CreateAddressRequest request) {
        return ResponseEntity.ok(addressService.createAddress(user.getId(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AddressDTO> updateAddress(@CurrentUser User user, @PathVariable Long id, @Valid @RequestBody UpdateAddressRequest request) {
        return ResponseEntity.ok(addressService.updateAddress(user.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddress(@CurrentUser User user, @PathVariable Long id) {
        addressService.deleteAddress(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<Void> setDefaultAddress(@CurrentUser User user, @PathVariable Long id) {
        addressService.setDefaultAddress(user.getId(), id);
        return ResponseEntity.ok().build();
    }
}
