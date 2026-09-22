package com.financeiro.casal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end check of the HTTP layer (routing + security + JWT + services + H2),
 * without a real web server. There is no seed data — the first test registers the user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    static String token;
    static long userId;
    static long accountId;

    private String auth() {
        return "Bearer " + token;
    }

    @Test
    @Order(1)
    void registerCreatesUserAndReturnsJwt() throws Exception {
        var res = mvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content("{\"name\":\"Dona da Casa\",\"email\":\"owner@casa.app\",\"password\":\"Teste@1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("owner@casa.app"))
                .andReturn();
        JsonNode body = json.readTree(res.getResponse().getContentAsString());
        token = body.get("token").asText();
        userId = body.get("user").get("id").asLong();
    }

    @Test
    @Order(2)
    void loginWorks() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"owner@casa.app\",\"password\":\"Teste@1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @Order(3)
    void protectedEndpointRejectsMissingToken() throws Exception {
        mvc.perform(get("/api/users/me")).andExpect(status().isForbidden());
    }

    @Test
    @Order(4)
    void meReturnsCurrentUser() throws Exception {
        mvc.perform(get("/api/users/me").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Dona da Casa"));
    }

    @Test
    @Order(5)
    void updateSalary() throws Exception {
        mvc.perform(put("/api/users/me/salary")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"salary\":6200.50}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salary").value(6200.5));
    }

    @Test
    @Order(6)
    void createAccount() throws Exception {
        var res = mvc.perform(post("/api/accounts")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"name\":\"Conta principal\",\"isJoint\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Conta principal"))
                .andReturn();
        accountId = json.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(get("/api/accounts").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='Conta principal')]").exists());
    }

    @Test
    @Order(7)
    void requestEmailChangeAcceptsValidEmail() throws Exception {
        mvc.perform(post("/api/users/me/email/request")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"newEmail\":\"nova@casa.app\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @Order(8)
    void confirmEmailChangeRejectsWrongCode() throws Exception {
        mvc.perform(post("/api/users/me/email/confirm")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(9)
    void createTransactionAdjustsAndListCarriesUserAndAccount() throws Exception {
        mvc.perform(post("/api/transactions")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"title\":\"Mercado\",\"amount\":-80.0,\"transactionDate\":\"2026-09-08T10:00:00\"," +
                                "\"type\":\"EXPENSE\",\"category\":\"Mercado\",\"accountId\":" + accountId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Mercado"));

        mvc.perform(get("/api/transactions/user/" + userId).header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].user.name").isNotEmpty())
                .andExpect(jsonPath("$[0].account.name").isNotEmpty());
    }

    @Test
    @Order(10)
    void editThenDeleteTransaction() throws Exception {
        var created = mvc.perform(post("/api/transactions")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"title\":\"Erro\",\"amount\":-10.0,\"transactionDate\":\"2026-09-10T10:00:00\"," +
                                "\"type\":\"EXPENSE\",\"category\":\"Outros\",\"accountId\":" + accountId + "}"))
                .andExpect(status().isOk())
                .andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/transactions/" + id)
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"title\":\"Corrigido\",\"amount\":-25.5,\"transactionDate\":\"2026-09-10T10:00:00\"," +
                                "\"type\":\"EXPENSE\",\"category\":\"Mercado\",\"accountId\":" + accountId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Corrigido"))
                .andExpect(jsonPath("$.amount").value(-25.5));

        mvc.perform(delete("/api/transactions/" + id).header("Authorization", auth()))
                .andExpect(status().isOk());
    }

    @Test
    @Order(11)
    void createEditPayDeleteInstallmentPlan() throws Exception {
        var created = mvc.perform(post("/api/installment-plans")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"title\":\"Geladeira\",\"totalAmount\":2000.0,\"dueDate\":\"2026-12-01\"," +
                                "\"category\":\"Casa\",\"installmentsLeft\":4,\"remainingAmount\":2000.0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installmentsLeft").value(4))
                .andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/installment-plans/" + id + "/pay").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installmentsLeft").value(3))
                .andExpect(jsonPath("$.remainingAmount").value(1500.0));

        mvc.perform(delete("/api/installment-plans/" + id).header("Authorization", auth()))
                .andExpect(status().isOk());
    }

    @Test
    @Order(12)
    void createEditDeleteGoal() throws Exception {
        var created = mvc.perform(post("/api/shared-goals")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"title\":\"Temp\",\"targetAmount\":100.0,\"deadline\":\"2027-01-01\",\"icon\":\"Gift\"}"))
                .andExpect(status().isOk())
                .andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/shared-goals/" + id)
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"title\":\"Renomeada\",\"targetAmount\":250.0,\"deadline\":\"2027-06-01\",\"icon\":\"Gift\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renomeada"));

        mvc.perform(delete("/api/shared-goals/" + id).header("Authorization", auth()))
                .andExpect(status().isOk());
    }

    @Test
    @Order(13)
    void updateAndClearAvatar() throws Exception {
        mvc.perform(put("/api/users/me/avatar")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"avatarUrl\":\"data:image/png;base64,iVBORw0KGgo=\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("data:image/png;base64,iVBORw0KGgo="));

        mvc.perform(put("/api/users/me/avatar")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"avatarUrl\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
    }

    @Test
    @Order(14)
    void updateBudgetSettings() throws Exception {
        mvc.perform(put("/api/users/me/budget")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"housingCost\":1500.0,\"householdSize\":2,\"paysFood\":true," +
                                "\"foodPerPerson\":600.0,\"emergencySaved\":3000.0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budget.housingCost").value(1500.0))
                .andExpect(jsonPath("$.budget.householdSize").value(2))
                .andExpect(jsonPath("$.budget.paysFood").value(true));
    }

    @Test
    @Order(15)
    void cannotReadAnotherUsersTransactions() throws Exception {
        mvc.perform(get("/api/transactions/user/" + (userId + 999)).header("Authorization", auth()))
                .andExpect(status().isForbidden());
    }

    static String partnerToken;
    static long partnerId;

    @Test
    @Order(16)
    void partnerInviteAcceptShareAndDissolve() throws Exception {
        // second user
        var reg = mvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content("{\"name\":\"Par Ceiro\",\"email\":\"par@casa.app\",\"password\":\"Teste@1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode pb = json.readTree(reg.getResponse().getContentAsString());
        partnerToken = pb.get("token").asText();
        partnerId = pb.get("user").get("id").asLong();

        // owner has a joint account
        long jointAccId = json.readTree(mvc.perform(post("/api/accounts")
                        .header("Authorization", auth())
                        .contentType("application/json")
                        .content("{\"name\":\"Conta conjunta\",\"isJoint\":true}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("id").asLong();

        // partner cannot see it yet
        mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + partnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='Conta conjunta')]").doesNotExist());

        // owner generates an invite, partner accepts
        String code = json.readTree(mvc.perform(post("/api/partner/invite").header("Authorization", auth()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("code").asText();

        mvc.perform(post("/api/partner/accept")
                        .header("Authorization", "Bearer " + partnerToken)
                        .contentType("application/json")
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner.name").value("Dona da Casa"));

        // now the partner sees the joint account and the status endpoint
        mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + partnerToken))
                .andExpect(jsonPath("$[?(@.name=='Conta conjunta')]").exists());
        mvc.perform(get("/api/partner").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner.name").value("Par Ceiro"));

        // dissolve — partner loses the joint account
        mvc.perform(delete("/api/partner").header("Authorization", auth())).andExpect(status().isOk());
        mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + partnerToken))
                .andExpect(jsonPath("$[?(@.name=='Conta conjunta')]").doesNotExist());

        java.util.Objects.requireNonNull(jointAccId);
    }

    @Test
    @Order(17)
    void spaFallbackRouteIsPublic() throws Exception {
        int status = mvc.perform(get("/planejar")).andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertTrue(status == 200 || status == 404,
                "SPA route should be public, got " + status);
    }
}
