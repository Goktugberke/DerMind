package com.dermind.DerMind.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Controller parametrelerinde authenticated user'ı doğrudan inject eder.
 * Tüm controller'lardaki duplicate getUserIdFromPrincipal helper'larını ortadan kaldırır.
 *
 * Kullanım:
 *   public ResponseEntity<...> getMyOrders(@CurrentUser User user) { ... }
 *
 * Authentication yoksa veya user DB'de bulunamazsa UserNotAuthenticatedException fırlatır.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
}
