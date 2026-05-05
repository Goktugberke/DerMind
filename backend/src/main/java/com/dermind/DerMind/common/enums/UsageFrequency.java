package com.dermind.DerMind.common.enums;

/**
 * Ürün kullanım sıklığı
 */
public enum UsageFrequency {
    DAILY("Günde 1 Kez"),
    TWICE_DAILY("Günde 2 Kez"),
    ONCE_WEEKLY("Haftada 1 Kez"),
    TWICE_WEEKLY("Haftada 2 Kez"),
    ALTERNATE_DAYS("Gün Aşırı");

    private final String displayName;

    UsageFrequency(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}