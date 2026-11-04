package com.financeiro.casal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Load test: N users hit each endpoint at the same instant, one endpoint at a time, so every
 * endpoint gets its own latency/error line. In-process (MockMvc + H2): measures app + DB, not network.
 * Off by default (slow):  ./mvnw test -Dtest=LoadTest -Dload=true [-Dload.users=1000]
 * Report: console and target/load-report.txt.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EnabledIfSystemProperty(named = "load", matches = "true")
class LoadTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    record User(int n, String auth, long id, long account) {}

    record Result(String endpoint, List<Long> ms, Map<String, Integer> errors, double secs) {}

    interface Call {
        JsonNode run(int i) throws Exception;
    }

    private JsonNode send(String auth, MockHttpServletRequestBuilder req, Object body) throws Exception {
        if (body != null) req.contentType("application/json").content(json.writeValueAsString(body));
        if (auth != null) req.header("Authorization", auth);
        var res = mvc.perform(req).andReturn().getResponse();
        String out = res.getContentAsString(StandardCharsets.UTF_8);
        if (res.getStatus() >= 400) throw new IllegalStateException(res.getStatus() + " " + out);
        return out.isEmpty() ? null : json.readTree(out);
    }

    /** Runs {@code call} for i = 0..n-1, all released at once on virtual threads. */
    private Result burst(String endpoint, int n, Call call) throws Exception {
        List<Long> ms = Collections.synchronizedList(new ArrayList<>());
        Map<String, Integer> errors = new ConcurrentHashMap<>();
        CountDownLatch go = new CountDownLatch(1);
        long t0;
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> all = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                int k = i;
                all.add(pool.submit(() -> {
                    go.await();
                    long s = System.nanoTime();
                    try {
                        call.run(k);
                    } catch (Exception e) {
                        // group by message, not by the per-request id
                        String msg = String.valueOf(e.getMessage()).replaceAll("\"requestId\":\"[^\"]*\",?", "");
                        errors.merge(msg.length() > 160 ? msg.substring(0, 160) : msg, 1, Integer::sum);
                    } finally {
                        ms.add((System.nanoTime() - s) / 1_000_000);
                    }
                    return null;
                }));
            }
            t0 = System.nanoTime();
            go.countDown();
            for (Future<?> f : all) f.get();
        }
        return new Result(endpoint, ms, errors, (System.nanoTime() - t0) / 1e9);
    }

    private static long pct(List<Long> sorted, double p) {
        return sorted.get(Math.max(0, (int) Math.ceil(p * sorted.size()) - 1));
    }

    @Test
    void everyEndpointUnderConcurrentLoad() throws Exception {
        int n = Integer.getInteger("load.users", 1000);
        String password = "Teste@1234";
        User[] users = new User[n];
        List<Result> results = new ArrayList<>();

        results.add(burst("POST /auth/register", n, i -> {
            JsonNode r = send(null, post("/api/auth/register"),
                    Map.of("name", "Carga " + i, "email", "carga" + i + "@load.test", "password", password));
            users[i] = new User(i, "Bearer " + r.get("token").asText(), r.get("user").get("id").asLong(), 0);
            return r;
        }));
        results.add(burst("POST /auth/login", n, i ->
                send(null, post("/api/auth/login"), Map.of("email", "carga" + i + "@load.test", "password", password))));
        results.add(burst("POST /accounts", n, i -> {
            User u = users[i];
            JsonNode r = send(u.auth(), post("/api/accounts"), Map.of("name", "Corrente", "isJoint", false));
            users[i] = new User(i, u.auth(), u.id(), r.get("id").asLong());
            return r;
        }));
        results.add(burst("POST /transactions", n, i -> send(users[i].auth(), post("/api/transactions"), Map.of(
                "title", "Mercado", "amount", -42.5, "transactionDate", "2026-11-03T12:00:00", "type", "EXPENSE",
                "category", "Mercado", "userId", users[i].id(), "accountId", users[i].account()))));
        results.add(burst("POST /shared-goals", n, i -> send(users[i].auth(), post("/api/shared-goals"),
                Map.of("title", "Viagem", "targetAmount", 5000, "deadline", "2027-12-01", "icon", "Plane"))));
        results.add(burst("POST /installment-plans", n, i -> send(users[i].auth(), post("/api/installment-plans"),
                Map.of("title", "Geladeira", "totalAmount", 3000, "dueDate", "2026-12-10", "category", "Casa",
                        "userId", users[i].id(), "installmentsLeft", 10))));
        results.add(burst("POST /recurring", n, i -> send(users[i].auth(), post("/api/recurring"), Map.of(
                "title", "Internet", "amount", 99.9, "type", "EXPENSE", "category", "Contas",
                "dayOfMonth", 10, "accountId", users[i].account()))));
        results.add(burst("PUT /users/me/category-budgets", n, i ->
                send(users[i].auth(), put("/api/users/me/category-budgets"), Map.of("Mercado", 900))));
        results.add(burst("GET /users/me", n, i -> send(users[i].auth(), get("/api/users/me"), null)));
        results.add(burst("GET /accounts", n, i -> send(users[i].auth(), get("/api/accounts"), null)));
        results.add(burst("GET /transactions/user/{id}", n, i ->
                send(users[i].auth(), get("/api/transactions/user/" + users[i].id()), null)));
        results.add(burst("GET /shared-goals", n, i -> send(users[i].auth(), get("/api/shared-goals"), null)));
        results.add(burst("GET /installment-plans/user/{id}", n, i ->
                send(users[i].auth(), get("/api/installment-plans/user/" + users[i].id()), null)));
        results.add(burst("GET /recurring", n, i -> send(users[i].auth(), get("/api/recurring"), null)));
        results.add(burst("GET /partner", n, i -> send(users[i].auth(), get("/api/partner"), null)));

        StringBuilder r = new StringBuilder(String.format("%n===== TESTE DE CARGA: %d usuários simultâneos por endpoint =====%n", n));
        r.append(String.format("%-34s %6s %6s %6s %6s %6s %7s %6s%n", "endpoint", "ok", "p50ms", "p95ms", "p99ms", "máxms", "req/s", "erros"));
        int failed = 0;
        for (Result res : results) {
            List<Long> s = new ArrayList<>(res.ms());
            Collections.sort(s);
            int errs = res.errors().values().stream().mapToInt(Integer::intValue).sum();
            failed += errs;
            r.append(String.format("%-34s %6d %6d %6d %6d %6d %7.0f %6d%n", res.endpoint(), s.size() - errs,
                    pct(s, .5), pct(s, .95), pct(s, .99), s.get(s.size() - 1), s.size() / res.secs(), errs));
            res.errors().forEach((msg, c) -> r.append("    ").append(c).append("x ").append(msg).append('\n'));
        }
        Files.writeString(Path.of("target/load-report.txt"), r);
        System.out.println(r);
        assertTrue(failed == 0, failed + " chamadas falharam — veja target/load-report.txt");
    }
}
