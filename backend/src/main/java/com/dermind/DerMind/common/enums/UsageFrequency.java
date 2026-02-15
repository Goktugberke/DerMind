package com.dermind.DerMind.common.enums;

/**
 * Ürün kullanım sıklığı
 */
public enum UsageFrequency {
    DAILY("Günde 1 Kez"),
    TWICE_DAILY("Günde 2 Kez");

    private final String displayName;

    UsageFrequency(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}