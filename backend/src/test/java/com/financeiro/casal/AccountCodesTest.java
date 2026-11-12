package com.financeiro.casal;

import com.financeiro.casal.model.EmailVerificationToken;
import com.financeiro.casal.repository.EmailVerificationTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Signup confirmation and password reset by e-mail code (verification forced on). */
@SpringBootTest(properties = "app.email-verification.required=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountCodesTest {

    @Autowired MockMvc mvc;
    @Autowired EmailVerificationTokenRepository tokens;

    String code(String purpose) {
        return tokens.findAll().stream().filter(t -> purpose.equals(t.getPurpose()))
                .reduce((a, b) -> b).map(EmailVerificationToken::getCode).orElseThrow();
    }

    void json(String url, String body, int status) throws Exception {
        mvc.perform(post(url).contentType("application/json").content(body)).andExpect(status().is(status));
    }

    @Test
    void signupNeedsCodeThenResetPassword() throws Exception {
        String e = "c" + UUID.randomUUID().toString().substring(0, 8) + "@t.app";
        String reg = "{\"name\":\"U\",\"email\":\"" + e + "\",\"password\":\"Teste@1234\"}";
        mvc.perform(post("/api/auth/register").contentType("application/json").content(reg))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.verificationRequired").value(true));
        json("/api/auth/login", "{\"email\":\"" + e + "\",\"password\":\"Teste@1234\"}", 403);
        json("/api/auth/verify", "{\"email\":\"" + e + "\",\"code\":\"000000x\"}", 400);
        mvc.perform(post("/api/auth/verify").contentType("application/json")
                        .content("{\"email\":\"" + e + "\",\"code\":\"" + code("VERIFY") + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").exists());
        json("/api/auth/login", "{\"email\":\"" + e + "\",\"password\":\"Teste@1234\"}", 200);

        json("/api/auth/forgot", "{\"email\":\"" + e + "\"}", 200);
        json("/api/auth/forgot", "{\"email\":\"ninguem@t.app\"}", 200); // same answer: no account enumeration
        json("/api/auth/reset", "{\"email\":\"" + e + "\",\"code\":\"" + code("RESET") + "\",\"newPassword\":\"fraca\"}", 400);
        json("/api/auth/reset", "{\"email\":\"" + e + "\",\"code\":\"" + code("RESET") + "\",\"newPassword\":\"Nova@12345\"}", 200);
        json("/api/auth/login", "{\"email\":\"" + e + "\",\"password\":\"Teste@1234\"}", 401);
        json("/api/auth/login", "{\"email\":\"" + e + "\",\"password\":\"Nova@12345\"}", 200);
    }
}
