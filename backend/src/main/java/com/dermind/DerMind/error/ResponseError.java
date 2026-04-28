package com.dermind.DerMind.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResponseError {
    private String errorCode;
    private List<ErrorMessage> errorMessages;
    private String path;
    private String traceId;
    @Builder.Default
    private Instant timestamp = Instant.now();

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorMessage {
        private String field;
        private String message;
    }
}
