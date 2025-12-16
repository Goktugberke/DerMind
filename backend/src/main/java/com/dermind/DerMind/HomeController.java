package com.dermind.DerMind;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@RestController
public class HomeController {

    @GetMapping("/home")
    public ResponseEntity<String> homePage() {
        return ResponseEntity.ok("Oturum açma başarılı! Ana sayfaya hoş geldiniz.");
    }
}