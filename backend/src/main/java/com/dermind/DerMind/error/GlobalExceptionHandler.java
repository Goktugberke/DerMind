package com.dermind.DerMind.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseError> handleValidation(MethodArgumentNotValidException ex) {
        log.debug("Validation error: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ResponseError.builder()
                .errorCode("VALIDATION_ERROR")
                .errorMessages(ex.getFieldErrors().stream()
                        .map(fe -> ResponseError.ErrorMessage.builder()
                                .field(fe.getField())
                                .message(fe.getDefaultMessage())
                                .build())
                        .toList())
                .build());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ResponseError> handleConstraintViolation(ConstraintViolationException ex) {
        log.debug("Constraint violation: {}", ex.getMessage());
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "constraint", ex.getMessage());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ResponseError> handleMissingParam(MissingServletRequestParameterException ex) {
        return error(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", ex.getParameterName(),
                "Required parameter is missing: " + ex.getParameterName());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ResponseError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return error(HttpStatus.BAD_REQUEST, "TYPE_MISMATCH", ex.getName(),
                "Invalid value for parameter '" + ex.getName() + "'");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResponseError> handleIllegalArgument(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, "ILLEGAL_ARGUMENT", "argument", ex.getMessage());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ResponseError> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "method", ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ResponseError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        log.warn("Access denied for {} {} : {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return error(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "authorization",
                "You do not have permission to access this resource");
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<ResponseError> handleAuthMissing(AuthenticationCredentialsNotFoundException ex) {
        return error(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "authentication",
                "Authentication required");
    }

    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<ResponseError> handleUnauthorized(UnauthorizedAccessException ex) {
        log.warn("Unauthorized access: {}", ex.getMessage());
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", "authorization", ex.getMessage());
    }

    @ExceptionHandler(UserNotAuthenticatedException.class)
    public ResponseEntity<ResponseError> handleNotAuthenticated(UserNotAuthenticatedException ex) {
        return error(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "authentication",
                ex.getMessage() != null ? ex.getMessage() : "Authentication required");
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ResponseError> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return error(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "resource", ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ResponseError> handleBusiness(BusinessException ex) {
        log.warn("Business error: {}", ex.getMessage());
        return error(HttpStatus.BAD_REQUEST, "BUSINESS_ERROR", "businessLogic", ex.getMessage());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ResponseError> handleOptimisticLock(OptimisticLockingFailureException ex) {
        log.warn("Optimistic lock failure: {}", ex.getMessage());
        return error(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION", "version",
                "Resource was modified by another request. Please retry.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ResponseError> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return error(HttpStatus.CONFLICT, "DATA_INTEGRITY_VIOLATION", "data",
                "Operation conflicts with existing data (e.g. duplicate or missing reference)");
    }

    @ExceptionHandler(AiServerUnavailableException.class)
    public ResponseEntity<ResponseError> handleAiUnavailable(AiServerUnavailableException ex) {
        log.error("AI server unavailable: {}", ex.getMessage());
        return error(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVER_UNAVAILABLE", "aiServer",
                "AI service is temporarily unavailable. Please try again later.");
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ResponseError> handleRestClient(RestClientException ex) {
        log.error("Upstream service error: {}", ex.getMessage());
        // Upstream'in raw response'unu client'a as-is dönmüyoruz (bilgi sızıntısı önleme)
        return error(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", "externalService",
                "An upstream service is unavailable. Please retry later.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ResponseError> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "general",
                "An unexpected error occurred. Please try again later.");
    }

    private ResponseEntity<ResponseError> error(HttpStatus status, String code, String field, String message) {
        return ResponseEntity.status(status).body(ResponseError.builder()
                .errorCode(code)
                .errorMessages(List.of(ResponseError.ErrorMessage.builder()
                        .field(field).message(message).build()))
                .build());
    }
}
