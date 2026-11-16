package com.financeiro.casal.controller;

import com.financeiro.casal.config.ApiErrorHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.AssistantService;
import com.financeiro.casal.service.AssistantTools;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.function.Supplier;

@RestController
@RequestMapping("/api/assistant")
@AllArgsConstructor
public class AssistantController {

    private final AssistantService assistant;
    private final AssistantTools tools;

    record SettingsRequest(String provider, String model, String apiKey, String notes) {}

    record ModelsRequest(String provider, String apiKey) {}

    record ChatRequest(List<AssistantService.ChatMessage> messages, AssistantService.Attachment attachment) {}

    record ExecuteRequest(String tool, JsonNode args) {}

    record ExecuteResult(String message, Object result) {}

    @GetMapping("/settings")
    public ResponseEntity<?> settings(@AuthenticationPrincipal User user) {
        return handle(() -> assistant.settings(user));
    }

    @PutMapping("/settings")
    public ResponseEntity<?> saveSettings(@AuthenticationPrincipal User user, @RequestBody SettingsRequest req) {
        return handle(() -> assistant.saveSettings(user, req.provider(), req.model(), req.apiKey(), req.notes()));
    }

    @PostMapping("/models")
    public ResponseEntity<?> models(@AuthenticationPrincipal User user, @RequestBody ModelsRequest req) {
        return handle(() -> Map.of("models", assistant.models(user, req.provider(), req.apiKey())));
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@AuthenticationPrincipal User user, @RequestBody ChatRequest req) {
        return handle(() -> assistant.chat(user, req.messages(), req.attachment()));
    }

    record Job(Long userId, long startedAt, CompletableFuture<AssistantService.ChatReply> reply) {}

    // ponytail: in-memory jobs, lost on restart and not shared across instances; persist them if we scale out.
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final ExecutorService runner = Executors.newVirtualThreadPerTaskExecutor();

    /** Same as /chat, but the answer keeps being worked on after the app is closed; fetch it with GET /chat/{id}. */
    @PostMapping("/chat/start")
    public ResponseEntity<?> start(@AuthenticationPrincipal User user, @RequestBody ChatRequest req) {
        return handle(() -> {
            assistant.requireAccess(user);
            long now = System.currentTimeMillis();
            jobs.values().removeIf(j -> now - j.startedAt() > 24 * 3600_000L);
            String id = UUID.randomUUID().toString();
            jobs.put(id, new Job(user.getId(), now,
                    CompletableFuture.supplyAsync(() -> assistant.chat(user, req.messages(), req.attachment()), runner)));
            return Map.of("id", id);
        });
    }

    @GetMapping("/chat/{id}")
    public ResponseEntity<?> job(@AuthenticationPrincipal User user, @PathVariable String id) {
        Job job = jobs.get(id);
        if (job == null || !job.userId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Essa resposta expirou. Envie a mensagem de novo."));
        }
        if (!job.reply().isDone()) return ResponseEntity.ok(Map.of("status", "running"));

        return handle(() -> {
            try {
                return job.reply().join();
            } catch (CompletionException e) {
                throw e.getCause() instanceof RuntimeException r ? r : e;
            }
        });
    }

    /** Runs an action the user confirmed on a card — with their own permissions, like the REST API. */
    @PostMapping("/execute")
    public ResponseEntity<?> execute(@AuthenticationPrincipal User user, @RequestBody ExecuteRequest req) {
        return handle(() -> {
            assistant.requireAccess(user);
            return new ExecuteResult(tools.label(req.tool()) + " — feito", tools.execute(user, req.tool(), req.args()));
        });
    }

    // Provider failures are 502, never 401/403: the frontend treats those as "session expired".
    private ResponseEntity<?> handle(Supplier<Object> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (AssistantService.AssistantException e) {
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }
}
