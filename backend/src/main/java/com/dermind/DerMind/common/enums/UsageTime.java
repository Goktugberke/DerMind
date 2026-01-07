package com.dermind.DerMind.common.enums;

/**
 * Ürün kullanım zamanı
 */
public enum UsageTime {
    MORNING("Sabah"),
    EVENING("Akşam"),
    MORNING_AND_EVENING("Sabah ve Akşam"),
    ANYTIME("Herhangi Bir Zaman");

    private final String displayName;

    UsageTime(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}