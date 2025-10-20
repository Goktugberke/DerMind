package com.dermind.DerMind.error;

import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Log4j2
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseError> handleMethodArgumentNotValidException(MethodArgumentNotValidException exception) {
        log.debug("Validation error: {}", exception.getMessage());

        final var responseBody = ResponseError.builder()
                .errorCode("VALIDATION_ERROR")
                .errorMessages(exception.getFieldErrors().stream()
                        .map(fieldError -> ResponseError.ErrorMessage.builder()
                                .field(fieldError.getField())
                                .message(fieldError.getDefaultMessage())
                                .build())
                        .toList())
                .build();

        return ResponseEntity.badRequest().body(responseBody);
    }


    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<ResponseError> handleUnauthorizedAccessException(UnauthorizedAccessException exception) {
        log.warn("Unauthorized access attempt: {}", exception.getMessage());

        ResponseError responseBody = ResponseError.builder()
                .errorCode("FORBIDDEN")
                .errorMessages(List.of(
                        ResponseError.ErrorMessage.builder()
                                .field("authorization")
                                .message(exception.getMessage())
                                .build()
                ))
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(responseBody);
    }


    @ExceptionHandler(UserNotAuthenticatedException.class)
    public ResponseEntity<ResponseError> handleUserNotAuthenticatedException(UserNotAuthenticatedException exception) {
        log.warn("Authentication required: {}", exception.getMessage());

        ResponseError responseBody = ResponseError.builder()
                .errorCode("AUTHENTICATION_REQUIRED")
                .errorMessages(List.of(
                        ResponseError.ErrorMessage.builder()
                                .field("authentication")
                                .message(exception.getMessage() != null ? exception.getMessage() : "Authentication required")
                                .build()
                ))
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(responseBody);
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ResponseError> handleRestClientException(RestClientException exception) {
        log.error("REST client error: {}", exception.getMessage());

        String message = (exception instanceof HttpClientErrorException httpEx && !httpEx.getResponseBodyAsString().isBlank())
                ? httpEx.getResponseBodyAsString()
                : (exception.getMessage() == null || exception.getMessage().isBlank())
                ? "A REST client error occurred."
                : exception.getMessage();

        ResponseError responseBody = ResponseError.builder()
                .errorCode("REST_CLIENT_ERROR")
                .errorMessages(List.of(
                        ResponseError.ErrorMessage.builder()
                                .field("externalService")
                                .message(message)
                                .build()
                ))
                .build();

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(responseBody);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ResponseError> handleRuntimeException(RuntimeException exception) {
        log.error("Runtime error: {}", exception.getMessage(), exception);

        String message = exception.getMessage() != null && !exception.getMessage().isBlank()
                ? exception.getMessage()
                : "An unexpected error occurred while processing your request.";

        ResponseError responseBody = ResponseError.builder()
                .errorCode("PROCESSING_ERROR")
                .errorMessages(List.of(
                        ResponseError.ErrorMessage.builder()
                                .field("general")
                                .message(message)
                                .build()
                ))
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(responseBody);
    }
}
