package com.financeiro.casal.config;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * One place that turns exceptions into the {@code {error}} shape the frontend shows, and logs them.
 * Business rule failures (RuntimeException with a user-facing message) → 400, logged at INFO.
 * Infrastructure failures (DB down, pool exhausted, bugs) → 500/503 with the stack trace at ERROR,
 * so they never hide behind a "400 bad request" again. Every response carries the request id.
 */
@Slf4j
@RestControllerAdvice
public class ApiErrorHandler {

    /** Used by controllers' catch blocks: same mapping as the advice below. */
    public static ResponseEntity<Map<String, String>> badRequest(Exception e) {
        if (e instanceof ResponseStatusException rse) return status(rse);
        if (isInfra(e)) return infra(e);
        log.info("regra de negócio: {}", e.getMessage());
        return ResponseEntity.badRequest().body(body(e.getMessage()));
    }

    private static boolean isInfra(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof DataAccessException || t instanceof TransactionException
                    || t instanceof java.sql.SQLException || t instanceof NullPointerException
                    || t instanceof org.hibernate.HibernateException
                    || t instanceof jakarta.persistence.PersistenceException) return true;
        }
        return false;
    }

    private static ResponseEntity<Map<String, String>> infra(Exception e) {
        log.error("falha interna", e);
        HttpStatus s = e instanceof DataAccessException || e instanceof TransactionException
                ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(s).body(body("Erro interno. Informe o código " + MDC.get("rid") + "."));
    }

    private static ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
        log.info("{}: {}", e.getStatusCode(), e.getReason());
        return ResponseEntity.status(e.getStatusCode()).body(body(e.getReason()));
    }

    private static Map<String, String> body(String msg) {
        if (msg == null || msg.isBlank()) msg = "Algo deu errado";
        String rid = MDC.get("rid");
        return rid == null ? Map.of("error", String.valueOf(msg)) : Map.of("error", String.valueOf(msg), "requestId", rid);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getAllErrors().stream()
                .map(err -> err.getDefaultMessage()).findFirst().orElse("Dados inválidos");
        log.info("validação: {}", msg);
        return ResponseEntity.badRequest().body(body(msg));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> responseStatus(ResponseStatusException e) {
        return status(e);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> unexpected(Exception e) {
        // Spring's own exceptions that already know their status (404 no route, 405, missing param…)
        if (e instanceof org.springframework.web.ErrorResponse er) {
            log.info("{}: {}", er.getStatusCode(), e.getMessage());
            return ResponseEntity.status(er.getStatusCode()).body(body(er.getBody().getDetail()));
        }
        return isInfra(e) || !(e instanceof RuntimeException) ? infra(e) : badRequest(e);
    }
}
