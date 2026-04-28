package com.dermind.DerMind.error;

public class AiServerUnavailableException extends RuntimeException {
    public AiServerUnavailableException(String url, String cause) {
        super("AI server unavailable [" + url + "]: " + cause);
    }
}
