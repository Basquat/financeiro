package com.financeiro.casal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Cross-user isolation, token validation, brute-force limits and money rules.
 * Every test registers its own synthetic users, so order doesn't matter.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Value("${app.jwt.secret}") String secret;

    record Who(String token, long id, String email) {
        String auth() { return "Bearer " + token; }
    }

    Who register() throws Exception {
        String email = "u" + UUID.randomUUID().toString().substring(0, 8) + "@t.app";
        JsonNode b = body(mvc.perform(post("/api/auth/register").contentType("application/json")
                .content("{\"name\":\"U\",\"email\":\"" + email + "\",\"password\":\"Teste@1234\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        return new Who(b.get("token").asText(), b.get("user").get("id").asLong(), email);
    }

    long account(Who w) throws Exception {
        return body(mvc.perform(post("/api/accounts").header("Authorization", w.auth()).contentType("application/json")
                .content("{\"name\":\"C\",\"isJoint\":false}")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    String tx(long accountId, String type, String amount) {
        return "{\"title\":\"x\",\"amount\":" + amount + ",\"transactionDate\":\"2026-02-28T10:00:00\",\"type\":\"" + type
                + "\",\"category\":\"Outros\",\"accountId\":" + accountId + "}";
    }

    long createTx(Who w, long accountId, String type, String amount) throws Exception {
        return body(mvc.perform(post("/api/transactions").header("Authorization", w.auth()).contentType("application/json")
                .content(tx(accountId, type, amount))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    double balance(Who w, long accountId) throws Exception {
        for (JsonNode a : body(mvc.perform(get("/api/accounts").header("Authorization", w.auth()))
                .andReturn().getResponse().getContentAsString())) {
            if (a.get("id").asLong() == accountId) return a.get("currentBalance").asDouble();
        }
        throw new AssertionError("account not visible");
    }

    JsonNode body(String s) throws Exception {
        return json.readTree(s);
    }

    // ---------- tokens ----------

    @Test
    void rejectsMissingForgedExpiredAndUnsignedTokens() throws Exception {
        Who a = register();
        mvc.perform(get("/api/users/me")).andExpect(status().isForbidden());

        String forged = Jwts.builder().subject(a.email()).expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor("another-secret-another-secret-123".getBytes(StandardCharsets.UTF_8)))
                .compact();
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + forged)).andExpect(status().isForbidden());

        String expired = Jwts.builder().subject(a.email()).expiration(new Date(System.currentTimeMillis() - 1000))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + expired)).andExpect(status().isForbidden());

        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        String none = b64.encodeToString("{\"alg\":\"none\"}".getBytes()) + "."
                + b64.encodeToString(("{\"sub\":\"" + a.email() + "\"}").getBytes()) + ".";
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + none)).andExpect(status().isForbidden());

        mvc.perform(get("/api/users/me").header("Authorization", a.auth())).andExpect(status().isOk());
    }

    @Test
    void profileLookupByEmailIsNotPublic() throws Exception {
        Who a = register();
        mvc.perform(get("/api/auth/profile").param("email", a.email())).andExpect(status().isForbidden());
    }

    // ---------- cross-user isolation (IDOR) ----------

    @Test
    void cannotWriteIntoAnotherUsersAccount() throws Exception {
        Who a = register(), b = register();
        long accB = account(b);

        mvc.perform(post("/api/transactions").header("Authorization", a.auth()).contentType("application/json")
                .content(tx(accB, "INCOME", "1000"))).andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(0.0, balance(b, accB));

        // userId in the payload is ignored: the transaction belongs to the token's user
        long accA = account(a);
        mvc.perform(post("/api/transactions").header("Authorization", a.auth()).contentType("application/json")
                        .content(tx(accA, "INCOME", "5").replace("{", "{\"userId\":" + b.id() + ",")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.id").value(a.id()));

        // can't move an own transaction into B's account either
        long txA = createTx(a, accA, "INCOME", "7");
        mvc.perform(put("/api/transactions/" + txA).header("Authorization", a.auth()).contentType("application/json")
                .content(tx(accB, "INCOME", "7"))).andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(0.0, balance(b, accB));
    }

    @Test
    void cannotTouchAnotherUsersTransactionsGoalsPlansOrAccounts() throws Exception {
        Who a = register(), b = register();
        long accB = account(b);
        long txB = createTx(b, accB, "EXPENSE", "10");

        mvc.perform(put("/api/transactions/" + txB).header("Authorization", a.auth()).contentType("application/json")
                .content(tx(accB, "INCOME", "999"))).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/transactions/" + txB).header("Authorization", a.auth())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/transactions/user/" + b.id()).header("Authorization", a.auth())).andExpect(status().isForbidden());
        mvc.perform(put("/api/accounts/" + accB).header("Authorization", a.auth()).contentType("application/json")
                .content("{\"name\":\"hack\",\"isJoint\":false}")).andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(-10.0, balance(b, accB));

        long goal = body(mvc.perform(post("/api/shared-goals").header("Authorization", b.auth()).contentType("application/json")
                .content("{\"title\":\"G\",\"targetAmount\":100,\"deadline\":\"2027-01-01\"}"))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(put("/api/shared-goals/" + goal + "/contribute").param("amount", "50")
                .header("Authorization", a.auth())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/shared-goals").header("Authorization", a.auth()))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("\"id\":" + goal + ","))));

        long plan = body(mvc.perform(post("/api/installment-plans").header("Authorization", b.auth()).contentType("application/json")
                .content("{\"title\":\"P\",\"totalAmount\":100,\"installmentsLeft\":3,\"dueDate\":\"2026-03-31\",\"category\":\"Outros\"}"))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/api/installment-plans/" + plan + "/pay").header("Authorization", a.auth()))
                .andExpect(status().isBadRequest());
        // B paying with A's account is refused too, and the plan is left untouched (rollback)
        long accA = account(a);
        mvc.perform(post("/api/installment-plans/" + plan + "/pay").param("accountId", String.valueOf(accA))
                .header("Authorization", b.auth())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/installment-plans/user/" + b.id()).header("Authorization", b.auth()))
                .andExpect(jsonPath("$[0].installmentsLeft").value(3));
    }

    // ---------- money rules ----------

    @Test
    void signFollowsTypeAndBalanceIsTheLedgerSum() throws Exception {
        Who a = register();
        long acc = account(a);
        createTx(a, acc, "INCOME", "0.10");
        createTx(a, acc, "INCOME", "0.20");
        long t = createTx(a, acc, "EXPENSE", "5"); // positive amount on an expense is stored negative
        org.junit.jupiter.api.Assertions.assertEquals(-4.7, balance(a, acc));

        mvc.perform(delete("/api/transactions/" + t).header("Authorization", a.auth())).andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertEquals(0.3, balance(a, acc));
    }

    @Test
    void rejectsMoreThanTwoDecimalsAndAbsurdValues() throws Exception {
        Who a = register();
        long acc = account(a);
        mvc.perform(post("/api/transactions").header("Authorization", a.auth()).contentType("application/json")
                .content(tx(acc, "INCOME", "1.005"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("2 casas")));
        mvc.perform(post("/api/transactions").header("Authorization", a.auth()).contentType("application/json")
                .content(tx(acc, "INCOME", "1e15"))).andExpect(status().isBadRequest());
    }

    @Test
    void installmentsSumExactlyToTheTotal() throws Exception {
        Who a = register();
        long acc = account(a);
        long plan = body(mvc.perform(post("/api/installment-plans").header("Authorization", a.auth()).contentType("application/json")
                .content("{\"title\":\"P\",\"totalAmount\":100,\"installmentsLeft\":3,\"dueDate\":\"2026-01-31\",\"category\":\"Outros\"}"))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/installment-plans/" + plan + "/pay").param("accountId", String.valueOf(acc))
                    .header("Authorization", a.auth())).andExpect(status().isOk());
        }
        mvc.perform(post("/api/installment-plans/" + plan + "/pay").param("accountId", String.valueOf(acc))
                .header("Authorization", a.auth())).andExpect(status().isBadRequest()); // already paid off
        org.junit.jupiter.api.Assertions.assertEquals(-100.0, balance(a, acc));
    }

    // ---------- brute force ----------

    @Test
    void passwordLoginIsThrottledAfterFiveFailures() throws Exception {
        Who a = register();
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType("application/json")
                    .content("{\"email\":\"" + a.email() + "\",\"password\":\"Errada@123\"}")).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"email\":\"" + a.email() + "\",\"password\":\"Teste@1234\"}")).andExpect(status().isTooManyRequests());
    }

    @Test
    void pinOnlyUnlocksItsOwnAccountAndIsWipedAfterFiveMisses() throws Exception {
        Who a = register(), b = register();
        mvc.perform(post("/api/auth/pin/set").header("Authorization", a.auth()).contentType("application/json")
                .content("{\"currentPassword\":\"Teste@1234\",\"pin\":\"2580\"}")).andExpect(status().isOk());

        // the old endpoint accepted a bare PIN and logged into whichever user matched
        mvc.perform(post("/api/auth/pin/login").contentType("application/json").content("{\"pin\":\"2580\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/pin/login").contentType("application/json")
                .content("{\"email\":\"" + b.email() + "\",\"pin\":\"2580\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/pin/login").contentType("application/json")
                        .content("{\"email\":\"" + a.email() + "\",\"pin\":\"2580\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.id").value(a.id()));

        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/pin/login").contentType("application/json")
                    .content("{\"email\":\"" + a.email() + "\",\"pin\":\"1357\"}")).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/pin/login").contentType("application/json")
                .content("{\"email\":\"" + a.email() + "\",\"pin\":\"2580\"}")).andExpect(status().isUnauthorized());
    }

    // ---------- browser hardening ----------

    @Test
    void avatarOnlyAcceptsImagesAndSpaHasCsp() throws Exception {
        Who a = register();
        mvc.perform(put("/api/users/me/avatar").header("Authorization", a.auth()).contentType("application/json")
                .content("{\"avatarUrl\":\"javascript:alert(1)\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/login")).andExpect(header().string("Content-Security-Policy", containsString("script-src 'self'")));
    }
}
