package com.financeiro.casal.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * One log line per API call: "GET /api/accounts → 200 em 12ms", tagged with a request id (rid) and the
 * user id (uid, set by the JWT filter) on every log line of that request. The id is echoed in the
 * X-Request-Id header and in error bodies, so a user's "código" leads straight to the stack trace.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLogFilter extends OncePerRequestFilter {

    static final long SLOW_MS = 1000;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String incoming = req.getHeader("X-Request-Id");
        String rid = incoming != null && incoming.matches("[A-Za-z0-9_-]{1,64}") ? incoming : UUID.randomUUID().toString().substring(0, 8);
        MDC.put("rid", rid);
        res.setHeader("X-Request-Id", rid);
        long t0 = System.nanoTime();
        try {
            chain.doFilter(req, res);
        } finally {
            long ms = (System.nanoTime() - t0) / 1_000_000;
            int status = res.getStatus();
            String line = "{} {} -> {} em {}ms"; // ASCII: Windows consoles mangle "→"
            if (status >= 500) log.error(line, req.getMethod(), req.getRequestURI(), status, ms);
            else if (ms >= SLOW_MS) log.warn(line + " (lento)", req.getMethod(), req.getRequestURI(), status, ms);
            else log.info(line, req.getMethod(), req.getRequestURI(), status, ms);
            MDC.clear();
        }
    }
}
