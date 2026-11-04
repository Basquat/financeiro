package com.financeiro.casal.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.TelegramService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
@AllArgsConstructor
public class TelegramController {

    private final TelegramService telegram;

    /** Public, but only Telegram knows the secret header. Answers at once; the assistant runs in the background. */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(@RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
                                     @RequestBody JsonNode update) {
        if (!telegram.validSecret(secret)) return ResponseEntity.status(404).build();
        Thread.ofVirtual().start(() -> telegram.handleUpdate(update));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(telegram.status(user));
    }

    @PostMapping("/link")
    public ResponseEntity<?> link(@AuthenticationPrincipal User user) {
        try {
            return ResponseEntity.ok(telegram.createLinkCode(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/link")
    public ResponseEntity<?> unlink(@AuthenticationPrincipal User user) {
        telegram.unlink(user);
        return ResponseEntity.ok(Map.of("message", "Telegram desconectado"));
    }
}
