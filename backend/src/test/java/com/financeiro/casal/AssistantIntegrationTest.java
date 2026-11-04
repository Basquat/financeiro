package com.financeiro.casal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.financeiro.casal.repository.UserRepository;
import com.financeiro.casal.service.AssistantService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** The assistant's guarantees: the key stays secret, and nothing is written until the user confirms. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:assistant-test;DB_CLOSE_DELAY=-1;MODE=LEGACY")
class AssistantIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    UserRepository users;

    @MockitoSpyBean
    AssistantService assistant;

    record Session(String auth, long userId) {}

    private Session register(String email) throws Exception {
        var res = mvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"name\":\"Teste\",\"email\":\"" + email + "\",\"password\":\"Teste@1234\"}"))
                .andExpect(status().isOk()).andReturn();
        JsonNode body = json.readTree(res.getResponse().getContentAsString());
        return new Session("Bearer " + body.get("token").asText(), body.get("user").get("id").asLong());
    }

    private long createAccount(Session s, String name) throws Exception {
        var res = mvc.perform(post("/api/accounts").header("Authorization", s.auth()).contentType("application/json")
                        .content("{\"name\":\"" + name + "\",\"isJoint\":false}"))
                .andExpect(status().isOk()).andReturn();
        return json.readTree(res.getResponse().getContentAsString()).get("id").asLong();
    }

    private String execute(String tool, Object args) throws Exception {
        return json.writeValueAsString(Map.of("tool", tool, "args", args));
    }

    @Test
    void keyIsStoredEncryptedAndNeverReturned() throws Exception {
        Session s = register("chave@casa.app");
        mvc.perform(put("/api/assistant/settings").header("Authorization", s.auth()).contentType("application/json")
                        .content("{\"provider\":\"nvidia\",\"model\":\"meta/llama\",\"apiKey\":\"nvapi-segredo-1234\",\"notes\":\"recebo dia 5\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasKey").value(true))
                .andExpect(jsonPath("$.keyHint", endsWith("1234")))
                .andExpect(content().string(not(containsString("segredo"))));

        String stored = users.findByEmail("chave@casa.app").orElseThrow().getAiKeyEnc();
        assertFalse(stored.contains("segredo"));

        mvc.perform(put("/api/assistant/settings").header("Authorization", s.auth()).contentType("application/json")
                        .content("{\"provider\":\"evil\",\"model\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void writeToolsAreOnlyProposedUntilConfirmed() throws Exception {
        Session s = register("chat@casa.app");
        long accountId = createAccount(s, "Nubank");
        mvc.perform(put("/api/assistant/settings").header("Authorization", s.auth()).contentType("application/json")
                        .content("{\"provider\":\"openai\",\"model\":\"gpt-teste\",\"apiKey\":\"sk-teste-0000\"}"))
                .andExpect(status().isOk());

        ObjectNode toolCall = json.createObjectNode();
        ObjectNode call = toolCall.putArray("choices").addObject().putObject("message")
                .put("role", "assistant").putNull("content").putArray("tool_calls").addObject()
                .put("id", "c1").put("type", "function");
        call.putObject("function").put("name", "criar_lancamento").put("arguments", json.writeValueAsString(Map.of(
                "title", "Mercado", "amount", 87.4, "transactionDate", "2026-11-02",
                "type", "EXPENSE", "category", "Mercado", "accountId", accountId)));
        JsonNode reply = json.readTree(
                "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"Preparei o lançamento, confirma no card?\"}}]}");
        doReturn(toolCall, reply).when(assistant).callProvider(any(), any(), eq("/chat/completions"), any());

        var res = mvc.perform(post("/api/assistant/chat").header("Authorization", s.auth()).contentType("application/json")
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"gastei 87,40 no mercado ontem\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply", containsString("confirma")))
                .andExpect(jsonPath("$.actions[0].tool").value("criar_lancamento"))
                .andReturn();

        // proposed, not written
        mvc.perform(get("/api/transactions/user/" + s.userId()).header("Authorization", s.auth()))
                .andExpect(jsonPath("$.length()").value(0));

        JsonNode action = json.readTree(res.getResponse().getContentAsString()).get("actions").get(0);
        mvc.perform(post("/api/assistant/execute").header("Authorization", s.auth()).contentType("application/json")
                        .content(execute(action.get("tool").asText(), action.get("args"))))
                .andExpect(status().isOk());

        mvc.perform(get("/api/transactions/user/" + s.userId()).header("Authorization", s.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].amount").value(-87.4))
                .andExpect(jsonPath("$[0].transactionDate", startsWith("2026-11-02")));
    }

    @Test
    void executeKeepsTheUsersOwnPermissions() throws Exception {
        Session me = register("dono@casa.app");
        Session other = register("outro@casa.app");
        long othersAccount = createAccount(other, "Conta do outro");

        mvc.perform(post("/api/assistant/execute").header("Authorization", me.auth()).contentType("application/json")
                        .content(execute("criar_lancamento", Map.of("title", "Invasão", "amount", 10,
                                "transactionDate", "2026-11-02", "type", "INCOME", "category", "X", "accountId", othersAccount))))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/assistant/execute").header("Authorization", me.auth()).contentType("application/json")
                        .content(execute("apagar_tudo", Map.of())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rememberAppendsToNotes() throws Exception {
        Session s = register("memoria@casa.app");
        mvc.perform(post("/api/assistant/execute").header("Authorization", s.auth()).contentType("application/json")
                        .content(execute("lembrar", Map.of("nota", "recebe vale-refeicao de 800"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/assistant/settings").header("Authorization", s.auth()))
                .andExpect(jsonPath("$.notes", containsString("vale-refeicao de 800")))
                .andExpect(jsonPath("$.hasKey").value(false));
    }
}
