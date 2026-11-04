package com.financeiro.casal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.util.Base64;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Category limits, monthly bills, transfers/credit card, OFX import and the LGPD export/delete. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeaturesIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    record Session(String auth, long userId) {}

    private Session register(String email) throws Exception {
        var res = mvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"name\":\"Pessoa\",\"email\":\"" + email + "\",\"password\":\"Teste@1234\"}"))
                .andExpect(status().isOk()).andReturn();
        JsonNode body = json.readTree(res.getResponse().getContentAsString());
        return new Session("Bearer " + body.get("token").asText(), body.get("user").get("id").asLong());
    }

    private JsonNode call(Session s, MockHttpServletRequestBuilder req, Object body) throws Exception {
        if (body != null) req.contentType("application/json").content(json.writeValueAsString(body));
        String out = mvc.perform(req.header("Authorization", s.auth())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return json.readTree(out);
    }

    private long account(Session s, String name, Map<String, Object> extra) throws Exception {
        var body = new java.util.HashMap<String, Object>(Map.of("name", name, "isJoint", false));
        body.putAll(extra);
        return call(s, post("/api/accounts"), body).get("id").asLong();
    }

    private double balance(Session s, long accountId) throws Exception {
        for (JsonNode a : call(s, get("/api/accounts"), null)) {
            if (a.get("id").asLong() == accountId) return a.get("currentBalance").asDouble();
        }
        throw new AssertionError("conta não encontrada");
    }

    @Test
    void categoryLimitsAreReplacedAndZeroRemoves() throws Exception {
        Session s = register("limites@app.com");
        call(s, put("/api/users/me/category-budgets"), Map.of("Mercado", 900, "Lazer", 200));
        mvc.perform(put("/api/users/me/category-budgets").header("Authorization", s.auth()).contentType("application/json")
                        .content("{\"Mercado\":950,\"Lazer\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryBudgets.Mercado").value(950.0))
                .andExpect(jsonPath("$.categoryBudgets.Lazer").doesNotExist());
    }

    @Test
    void recurringBillIsPostedOncePerMonth() throws Exception {
        Session s = register("fixas@app.com");
        long acc = account(s, "Corrente", Map.of());
        long id = call(s, post("/api/recurring"), Map.of("title", "Aluguel", "amount", 1500, "type", "EXPENSE",
                "category", "Moradia", "dayOfMonth", 31, "accountId", acc)).get("id").asLong();
        mvc.perform(get("/api/recurring").header("Authorization", s.auth()))
                .andExpect(jsonPath("$[0].pendingThisMonth").value(true));

        call(s, post("/api/recurring/" + id + "/post"), null);
        YearMonth month = YearMonth.now(java.time.ZoneId.of("America/Sao_Paulo"));
        mvc.perform(get("/api/transactions/user/" + s.userId()).header("Authorization", s.auth()))
                .andExpect(jsonPath("$[0].amount").value(-1500.0))
                .andExpect(jsonPath("$[0].transactionDate", startsWith(month.atEndOfMonth().toString()))); // day 31 clamped

        mvc.perform(post("/api/recurring/" + id + "/post").header("Authorization", s.auth())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/recurring").header("Authorization", s.auth()))
                .andExpect(jsonPath("$[0].pendingThisMonth").value(false));
    }

    @Test
    void transferMovesMoneyAndPaysTheCard() throws Exception {
        Session s = register("transfer@app.com");
        long checking = account(s, "Corrente", Map.of());
        long card = account(s, "Cartão", Map.of("creditCard", true, "closingDay", 3, "dueDay", 10));
        mvc.perform(get("/api/accounts").header("Authorization", s.auth()))
                .andExpect(jsonPath("$[?(@.name=='Cartão')].creditCard").value(true))
                .andExpect(jsonPath("$[?(@.name=='Cartão')].dueDay").value(10));

        call(s, post("/api/transactions"), Map.of("title", "Mercado", "amount", 300, "transactionDate", "2026-11-01T12:00:00",
                "type", "EXPENSE", "category", "Mercado", "accountId", card));
        call(s, post("/api/transactions/transfer"), Map.of("fromAccountId", checking, "toAccountId", card, "amount", 300));

        org.junit.jupiter.api.Assertions.assertEquals(0.0, balance(s, card));
        org.junit.jupiter.api.Assertions.assertEquals(-300.0, balance(s, checking));
        mvc.perform(post("/api/transactions/transfer").header("Authorization", s.auth()).contentType("application/json")
                        .content(json.writeValueAsString(Map.of("fromAccountId", card, "toAccountId", card, "amount", 1))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ofxImportPreviewsCommitsAndFlagsDuplicates() throws Exception {
        Session s = register("ofx@app.com");
        long acc = account(s, "Banco", Map.of());
        String ofx = """
                OFXHEADER:100
                CHARSET:1252
                <OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
                <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261102120000[-3:BRT]<TRNAMT>-45,90<FITID>1<MEMO>UBER *TRIP
                </STMTTRN>
                <STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261105<TRNAMT>5200.00<FITID>2<MEMO>PAGTO SALARIO EMPRESA X
                </STMTTRN>
                </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
                """;
        String data = Base64.getEncoder().encodeToString(ofx.getBytes(StandardCharsets.ISO_8859_1));

        JsonNode rows = call(s, post("/api/import/ofx"), Map.of("accountId", acc, "data", data)).get("rows");
        org.junit.jupiter.api.Assertions.assertEquals(2, rows.size());
        org.junit.jupiter.api.Assertions.assertEquals("Transporte", rows.get(0).get("category").asText());
        org.junit.jupiter.api.Assertions.assertEquals(-45.9, rows.get(0).get("amount").asDouble());
        org.junit.jupiter.api.Assertions.assertEquals("Salário", rows.get(1).get("category").asText());

        call(s, post("/api/import/commit"), Map.of("accountId", acc, "rows", rows));
        mvc.perform(get("/api/transactions/user/" + s.userId()).header("Authorization", s.auth()))
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(post("/api/import/ofx").header("Authorization", s.auth()).contentType("application/json")
                        .content(json.writeValueAsString(Map.of("accountId", acc, "data", data))))
                .andExpect(jsonPath("$.rows[0].duplicate").value(true));
    }

    @Test
    void exportHasNoSecretsAndDeleteKeepsThePartnersJointAccount() throws Exception {
        Session me = register("sair@app.com");
        Session other = register("fica@app.com");
        long mine = account(me, "Minha", Map.of());
        call(me, post("/api/transactions"), Map.of("title", "Café", "amount", 8, "transactionDate", "2026-11-01T12:00:00",
                "type", "EXPENSE", "category", "Alimentação", "accountId", mine));

        // the other person shares a joint account with me
        long joint = account(other, "Casa", Map.of("isJoint", true));
        String code = call(other, post("/api/partner/invite"), null).get("code").asText();
        call(me, post("/api/partner/accept"), Map.of("code", code));
        call(me, post("/api/transactions"), Map.of("title", "Luz", "amount", 120, "transactionDate", "2026-11-01T12:00:00",
                "type", "EXPENSE", "category", "Utilidades", "accountId", joint));

        mvc.perform(get("/api/users/me/export").header("Authorization", me.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lancamentos.length()").value(2))
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("$2a$"))));

        mvc.perform(post("/api/users/me/delete").header("Authorization", me.auth()).contentType("application/json")
                        .content("{\"password\":\"errada\"}"))
                .andExpect(status().isBadRequest());
        call(me, post("/api/users/me/delete"), Map.of("password", "Teste@1234"));

        mvc.perform(get("/api/users/me").header("Authorization", me.auth())).andExpect(status().isForbidden());
        mvc.perform(get("/api/accounts").header("Authorization", other.auth()))
                .andExpect(jsonPath("$[?(@.name=='Casa')]").exists());
        org.junit.jupiter.api.Assertions.assertEquals(0.0, balance(other, joint)); // my bill left with me
    }
}
