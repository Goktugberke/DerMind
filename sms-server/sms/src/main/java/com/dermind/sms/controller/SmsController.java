package com.dermind.sms.controller;

import com.dermind.sms.dto.SmsRequest;
import com.dermind.sms.dto.SmsResponse;
import com.dermind.sms.service.SmsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Log4j2
@RestController
@RequestMapping("/api/sms")
@RequiredArgsConstructor
public class SmsController {

    private final SmsService smsService;

    @PostMapping("/send")
    public ResponseEntity<SmsResponse> sendSms(@Valid @RequestBody SmsRequest smsRequest) {
        log.debug("Received SMS request for: {}", smsRequest.getPhoneNumber());
        SmsResponse response = smsService.sendSms(smsRequest);
        return ResponseEntity.ok(response);
    }
}