package com.financeiro.casal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.financeiro.casal.service.AssistantService;
import com.financeiro.casal.service.TelegramService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Telegram: link with a one-time code, chat, and writes only after the Confirmar button. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:telegram-test;DB_CLOSE_DELAY=-1;MODE=LEGACY",
        "app.telegram.token=test-token", "app.telegram.secret=s3cret", "app.telegram.bot-username=financeplus_bot"})
class TelegramIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @MockitoSpyBean
    TelegramService telegram;

    @MockitoSpyBean
    AssistantService assistant;

    private JsonNode update(String jsonText) throws Exception {
        return json.readTree(jsonText);
    }

    @Test
    void linkChatAndConfirmAWriteWithTheButton() throws Exception {
        doReturn(json.createObjectNode()).when(telegram).callTelegram(anyString(), any());

        var reg = json.readTree(mvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"name\":\"Bia Lima\",\"email\":\"bia@app.com\",\"password\":\"Teste@1234\"}"))
                .andReturn().getResponse().getContentAsString());
        String auth = "Bearer " + reg.get("token").asText();
        long uid = reg.get("user").get("id").asLong();
        long acc = json.readTree(mvc.perform(post("/api/accounts").header("Authorization", auth).contentType("application/json")
                .content("{\"name\":\"Nubank\",\"isJoint\":false}")).andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(put("/api/assistant/settings").header("Authorization", auth).contentType("application/json")
                .content("{\"provider\":\"nvidia\",\"model\":\"m\",\"apiKey\":\"nvapi-x\"}")).andExpect(status().isOk());

        // webhook refuses anyone without Telegram's secret
        mvc.perform(post("/api/telegram/webhook").contentType("application/json").content("{}")).andExpect(status().isNotFound());

        // link: code from the app, sent to the bot as /start CODE
        String code = json.readTree(mvc.perform(post("/api/telegram/link").header("Authorization", auth))
                .andExpect(jsonPath("$.link").value(org.hamcrest.Matchers.startsWith("https://t.me/financeplus_bot?start=")))
                .andReturn().getResponse().getContentAsString()).get("code").asText();
        telegram.handleUpdate(update("{\"message\":{\"chat\":{\"id\":777},\"text\":\"/start " + code + "\"}}"));
        mvc.perform(get("/api/telegram/status").header("Authorization", auth)).andExpect(jsonPath("$.linked").value(true));

        // a message turns into a proposal with buttons, nothing written yet
        ObjectNode toolCall = json.createObjectNode();
        ObjectNode call = toolCall.putArray("choices").addObject().putObject("message").put("role", "assistant")
                .putNull("content").putArray("tool_calls").addObject().put("id", "c1").put("type", "function");
        call.putObject("function").put("name", "criar_lancamento").put("arguments", json.writeValueAsString(Map.of(
                "title", "Uber", "amount", 30, "transactionDate", "2026-11-04", "type", "EXPENSE",
                "category", "Transporte", "accountId", acc)));
        JsonNode text = json.readTree("{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"Confirma o Uber?\"}}]}");
        doReturn(toolCall, text).when(assistant).callProvider(any(), any(), eq("/chat/completions"), any());

        telegram.handleUpdate(update("{\"message\":{\"chat\":{\"id\":777},\"text\":\"gastei 30 no uber\"}}"));
        mvc.perform(get("/api/transactions/user/" + uid).header("Authorization", auth)).andExpect(jsonPath("$.length()").value(0));

        ArgumentCaptor<ObjectNode> sent = ArgumentCaptor.forClass(ObjectNode.class);
        verify(telegram, atLeastOnce()).callTelegram(eq("sendMessage"), sent.capture());
        String okData = sent.getAllValues().stream().filter(b -> b.has("reply_markup"))
                .map(b -> b.at("/reply_markup/inline_keyboard/0/0/callback_data").asText()).findFirst().orElseThrow();
        assertTrue(okData.startsWith("ok:"));

        // Confirmar → written with the user's own permissions
        telegram.handleUpdate(update("{\"callback_query\":{\"id\":\"q1\",\"data\":\"" + okData
                + "\",\"message\":{\"chat\":{\"id\":777},\"message_id\":5}}}"));
        mvc.perform(get("/api/transactions/user/" + uid).header("Authorization", auth))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].amount").value(-30.0));

        // the same button can't run twice, and an unlinked chat gets instructions instead of data
        telegram.handleUpdate(update("{\"callback_query\":{\"id\":\"q2\",\"data\":\"" + okData
                + "\",\"message\":{\"chat\":{\"id\":777},\"message_id\":5}}}"));
        telegram.handleUpdate(update("{\"message\":{\"chat\":{\"id\":999},\"text\":\"meu saldo?\"}}"));
        mvc.perform(get("/api/transactions/user/" + uid).header("Authorization", auth)).andExpect(jsonPath("$.length()").value(1));
    }
}
