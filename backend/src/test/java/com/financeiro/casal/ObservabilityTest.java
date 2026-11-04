package com.financeiro.casal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Every API answer carries a request id, and error bodies repeat it so a user report maps to a log line. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ObservabilityTest {

    @Autowired
    MockMvc mvc;

    private static final String BODY = "{\"name\":\"Obs\",\"email\":\"obs@app.com\",\"password\":\"Teste@1234\"}";

    @Test
    void requestIdIsEchoedAndAppearsInErrors() throws Exception {
        mvc.perform(post("/api/auth/register").contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Request-Id"));

        // duplicate e-mail: business error stays 400 and carries the caller's id
        mvc.perform(post("/api/auth/register").header("X-Request-Id", "abc-123")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-Request-Id", "abc-123"))
                .andExpect(jsonPath("$.requestId").value("abc-123"))
                .andExpect(jsonPath("$.error").exists());
    }
}
