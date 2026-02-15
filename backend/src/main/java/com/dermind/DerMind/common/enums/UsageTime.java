package com.dermind.DerMind.common.enums;

/**
 * Ürün kullanım zamanı
 */
public enum UsageTime {
    MORNING("Sabah"),
    NOON("Öğle"),
    EVENING("Akşam"),
    ANYTIME("Herhangi Bir Zaman");

    private final String displayName;

    UsageTime(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}