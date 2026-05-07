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

    public void sendDuolingoReminderMail(String toEmail, String userName, String productName) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            System.err.println("Cannot send reminder mail: Email is null or empty");
            return;
        }

        String[] funnyMessages = {
            "Cildin şu an ağlıyor olabilir... 😢 O " + productName + "'i sürmek sadece 2 dakikanı alırdı!",
            "Beni unuttun mu? Yoksa başka bir rutine mi başladın? Kalbim kırıldı... 💔 Hadi git ve " + productName + "'i kullan!",
            "Serini kaybetmek üzeresin! Eğer hemen " + productName + "'i kullanmazsan, emeklerin çöpe gidebilir. (Tehdit etmiyorum, sadece uyarıyorum 🦉)",
            "Tık tık! Kim o? Cildin! 'Lütfen artık bana " + productName + " sür' diyor. Duyuyor musun? 🤷‍♀️",
            "Duolingo kuşu sana kızgın! Şaka şaka, ben DerMind. Ama gerçekten " + productName + "'i kullanmanın tam sırası değil mi sence de? ⏰",
            "Cilt bakım rutininin arkasından el sallamak istemiyorsan hemen " + productName + "'i yüzüne boca et! (Yani, gerektiği kadar sür) 🏃‍♀️",
            "Aynaya bak. O ışıl ışıl cildi kaybetmek ister misin? İstemezsin... O zaman " + productName + " seni bekliyor! ✨"
        };

        String selectedMessage = funnyMessages[new java.util.Random().nextInt(funnyMessages.length)];

        try {
            String subject = "Hey " + userName + ", rutinin tehlikede! 🚨";
            
            StringBuilder body = new StringBuilder();
            body.append("Merhaba ").append(userName).append(",\n\n");
            body.append(selectedMessage).append("\n\n");
            body.append("Serini korumak ve gününü tamamlamak için hemen uygulamamıza gir ve rutini tamamladığını işaretle!\n");
            body.append("http://localhost:5173/profile\n\n");
            body.append("Sevgiyle (ve biraz sitemle),\nDerMind Ekibi 🦉");

            MailRequestDto requestDto = MailRequestDto.builder()
                    .to(toEmail)
                    .subject(subject)
                    .text(body.toString())
                    .build();

            String endpoint = mailServerUrl + "/api/mail/send";
            
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, requestDto, String.class);
            System.out.println("Mail server response (Reminder): " + response.getBody());
        } catch (Exception e) {
            System.err.println("Error sending reminder mail: " + e.getMessage());
        }
    }
}
