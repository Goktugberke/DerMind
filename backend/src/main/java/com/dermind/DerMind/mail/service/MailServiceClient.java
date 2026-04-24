package com.dermind.DerMind.mail.service;

import com.dermind.DerMind.mail.dto.MailRequestDto;
import com.dermind.DerMind.purchase.dto.PurchaseResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class MailServiceClient {

    private final RestTemplate restTemplate;

    // The local mail server is running on port 8081 based on our configuration
    @Value("${mail.server.url:http://localhost:8081}")
    private String mailServerUrl;

    public MailServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void sendOrderConfirmationMail(String toEmail, PurchaseResponseDTO purchase) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            System.err.println("Cannot send order confirmation mail: Email is null or empty");
            return;
        }

        try {
            String subject = "Siparişiniz Alındı! - DerMind";
            
            // Sipariş bilgilerini HTML veya metin formatında oluştur
            StringBuilder body = new StringBuilder();
            body.append("Merhaba,\n\n");
            body.append("Siparişiniz başarıyla alınmıştır. Bizi tercih ettiğiniz için teşekkür ederiz.\n\n");
            body.append("Sipariş Detayları:\n");
            body.append("- Ürün: ").append(purchase.getProductName()).append(" (").append(purchase.getProductBrand()).append(")\n");
            body.append("- Adet: ").append(purchase.getQuantity()).append("\n");
            body.append("- Toplam Tutar: ").append(purchase.getTotalPrice()).append(" TL\n\n");
            body.append("Sipariş durumunu takip etmek için aşağıdaki bağlantıya tıklayabilirsiniz:\n");
            body.append("http://localhost:5173/orders\n\n");
            body.append("Sağlıklı günler dileriz,\nDerMind Ekibi");

            MailRequestDto requestDto = MailRequestDto.builder()
                    .to(toEmail)
                    .subject(subject)
                    .text(body.toString())
                    .build();

            String endpoint = mailServerUrl + "/api/mail/send";
            
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, requestDto, String.class);
            System.out.println("Mail server response: " + response.getBody());
        } catch (Exception e) {
            // Hata alırsak satın almayı durdurmamak için sadece logluyoruz
            System.err.println("Error sending order confirmation mail: " + e.getMessage());
        }
    }
}
