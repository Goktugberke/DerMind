package com.dermind.DerMind.purchase.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseCreateDTO {

    @NotNull(message = "Product ID boş olamaz")
    private Long productId;

    @NotNull(message = "Adet bilgisi boş olamaz")
    @Min(value = 1, message = "En az 1 adet ürün seçilmelidir")
    private Integer quantity;

    @NotNull(message = "Birim fiyat boş olamaz")
    @DecimalMin(value = "0.0", inclusive = false, message = "Fiyat 0'dan büyük olmalıdır")
    private BigDecimal unitPrice;

    @NotBlank(message = "Ödeme yöntemi seçilmelidir")
    private String paymentMethod;

    @NotBlank(message = "Teslimat adresi boş olamaz")
    @Size(min = 10, max = 500, message = "Adres en az 10, en fazla 500 karakter olmalıdır")
    private String shippingAddress;

    private String notes;
}