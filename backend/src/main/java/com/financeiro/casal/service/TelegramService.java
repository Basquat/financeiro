package com.financeiro.casal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The same assistant over Telegram. Off unless TELEGRAM_BOT_TOKEN is set. A chat is linked to an account
 * with a one-time code from the app; write actions arrive as Confirmar/Descartar buttons.
 */
@Slf4j
@Service
public class TelegramService {

    public record Status(boolean enabled, boolean linked, String botUsername) {}

    record Pending(Long userId, AssistantService.Action action, Instant createdAt) {}

    record LinkCode(Long userId, Instant expiresAt) {}

    static final int HISTORY = 10;
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final AssistantService assistant;
    private final AssistantTools tools;
    private final UserRepository userRepository;
    private final ObjectMapper json;
    private final String token;
    private final String secret;
    private final String botUsername;
    private final String publicUrl;
    private final SecureRandom random = new SecureRandom();

    // ponytail: in memory — a restart drops pending buttons, link codes and chat context; move to the DB if that bites
    private final Map<String, Pending> pending = new ConcurrentHashMap<>();
    private final Map<String, LinkCode> codes = new ConcurrentHashMap<>();
    private final Map<Long, Deque<AssistantService.ChatMessage>> histories = new ConcurrentHashMap<>();

    private static final class Http {
        static final HttpClient CLIENT = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public TelegramService(AssistantService assistant, AssistantTools tools, UserRepository userRepository, ObjectMapper json,
                           @Value("${app.telegram.token:}") String token,
                           @Value("${app.telegram.secret:}") String secret,
                           @Value("${app.telegram.bot-username:}") String botUsername,
                           @Value("${app.public-url:}") String publicUrl) {
        this.assistant = assistant;
        this.tools = tools;
        this.userRepository = userRepository;
        this.json = json;
        this.token = token;
        this.secret = secret;
        this.botUsername = botUsername;
        this.publicUrl = publicUrl;
    }

    public boolean enabled() {
        return !token.isBlank() && !secret.isBlank();
    }

    /** Points the bot at this server when TELEGRAM_BOT_TOKEN and APP_PUBLIC_URL are set. */
    @EventListener(ApplicationReadyEvent.class)
    public void registerWebhook() {
        if (!enabled() || publicUrl.isBlank()) return;
        try {
            ObjectNode body = json.createObjectNode().put("url", publicUrl.replaceAll("/$", "") + "/api/telegram/webhook")
                    .put("secret_token", secret);
            body.putArray("allowed_updates").add("message").add("callback_query");
            callTelegram("setWebhook", body);
            log.info("Telegram webhook registrado");
        } catch (Exception e) {
            log.warn("Não consegui registrar o webhook do Telegram: {}", e.getMessage());
        }
    }

    public boolean validSecret(String header) {
        return enabled() && header != null
                && MessageDigest.isEqual(header.getBytes(StandardCharsets.UTF_8), secret.getBytes(StandardCharsets.UTF_8));
    }

    // ---------- linking (from the app) ----------

    public Status status(User user) {
        User u = userRepository.findById(user.getId()).orElseThrow();
        return new Status(enabled(), u.getTelegramChatId() != null, botUsername);
    }

    /** One-time code, valid 10 minutes, sent to the bot as /start CODE. */
    public Map<String, String> createLinkCode(User user) {
        if (!enabled()) throw new RuntimeException("O Telegram não está configurado neste servidor.");
        codes.values().removeIf(c -> c.expiresAt().isBefore(Instant.now()));
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 8; i++) code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        codes.put(code.toString(), new LinkCode(user.getId(), Instant.now().plus(Duration.ofMinutes(10))));
        String link = botUsername.isBlank() ? "" : "https://t.me/" + botUsername + "?start=" + code;
        return Map.of("code", code.toString(), "link", link);
    }

    public void unlink(User user) {
        User u = userRepository.findById(user.getId()).orElseThrow();
        if (u.getTelegramChatId() != null) histories.remove(u.getTelegramChatId());
        u.setTelegramChatId(null);
        userRepository.save(u);
    }

    // ---------- updates (from Telegram) ----------

    public void handleUpdate(JsonNode update) {
        if (update.has("callback_query")) {
            handleButton(update.get("callback_query"));
            return;
        }
        JsonNode msg = update.path("message");
        long chatId = msg.path("chat").path("id").asLong();
        if (chatId == 0) return;
        try {
            String text = msg.path("text").asText(msg.path("caption").asText("")).strip();
            if (text.startsWith("/start")) {
                link(chatId, text.substring("/start".length()).strip());
                return;
            }
            Optional<User> user = userRepository.findByTelegramChatId(chatId);
            if (user.isEmpty()) {
                send(chatId, "Oi! Para conversar comigo, abra o finance+ → Assistente → Conectar Telegram.");
                return;
            }
            AssistantService.Attachment attachment = attachmentOf(msg);
            if (text.isEmpty() && attachment == null) return;

            Deque<AssistantService.ChatMessage> history = histories.computeIfAbsent(chatId, k -> new ArrayDeque<>());
            history.addLast(new AssistantService.ChatMessage("user", text.isEmpty() ? "Analise o anexo." : text));
            callTelegram("sendChatAction", json.createObjectNode().put("chat_id", chatId).put("action", "typing"));

            AssistantService.ChatReply reply = assistant.chat(user.get(), new ArrayList<>(history), attachment);
            StringBuilder remembered = new StringBuilder(reply.reply());
            for (AssistantService.Action a : reply.actions()) remembered.append("\n(").append(a.label()).append(": card enviado)");
            history.addLast(new AssistantService.ChatMessage("assistant", remembered.toString()));
            while (history.size() > HISTORY) history.removeFirst();

            if (!reply.reply().isBlank()) send(chatId, reply.reply());
            for (AssistantService.Action a : reply.actions()) sendCard(chatId, user.get().getId(), a);
        } catch (Exception e) {
            send(chatId, "Não consegui: " + e.getMessage());
        }
    }

    private void link(long chatId, String code) {
        LinkCode c = codes.remove(code.toUpperCase(Locale.ROOT));
        if (c == null || c.expiresAt().isBefore(Instant.now())) {
            send(chatId, "Código inválido ou vencido. Gere outro no app: Assistente → Conectar Telegram.");
            return;
        }
        userRepository.findByTelegramChatId(chatId).ifPresent(previous -> {
            previous.setTelegramChatId(null);
            userRepository.saveAndFlush(previous);
        });
        User u = userRepository.findById(c.userId()).orElseThrow();
        u.setTelegramChatId(chatId);
        userRepository.save(u);
        send(chatId, "Pronto, " + u.getName().split(" ")[0] + "! Pode me mandar gastos, perguntas ou foto de comprovante. "
                + "Antes de gravar qualquer coisa, eu peço sua confirmação.");
    }

    private void sendCard(long chatId, Long userId, AssistantService.Action action) {
        pending.values().removeIf(p -> p.createdAt().isBefore(Instant.now().minus(Duration.ofDays(1))));
        String id = UUID.randomUUID().toString().substring(0, 12);
        pending.put(id, new Pending(userId, action, Instant.now()));

        StringBuilder text = new StringBuilder(action.label());
        action.args().fields().forEachRemaining(f -> text.append("\n• ").append(f.getKey()).append(": ").append(
                f.getValue().isTextual() ? f.getValue().asText() : f.getValue().toString()));
        ObjectNode body = json.createObjectNode().put("chat_id", chatId).put("text", text.toString());
        var row = body.putObject("reply_markup").putArray("inline_keyboard").addArray();
        row.addObject().put("text", "Confirmar").put("callback_data", "ok:" + id);
        row.addObject().put("text", "Descartar").put("callback_data", "no:" + id);
        callTelegram("sendMessage", body);
    }

    private void handleButton(JsonNode query) {
        String data = query.path("data").asText("");
        long chatId = query.path("message").path("chat").path("id").asLong();
        int messageId = query.path("message").path("message_id").asInt();
        callTelegram("answerCallbackQuery", json.createObjectNode().put("callback_query_id", query.path("id").asText()));

        Pending p = data.length() > 3 ? pending.remove(data.substring(3)) : null;
        Optional<User> user = userRepository.findByTelegramChatId(chatId);
        if (p == null || user.isEmpty() || !user.get().getId().equals(p.userId())) {
            edit(chatId, messageId, "Esse card expirou.");
            return;
        }
        if (data.startsWith("no:")) {
            edit(chatId, messageId, p.action().label() + " — descartado");
            remember(chatId, p.action().label() + ": descartado pelo usuário");
            return;
        }
        try {
            tools.execute(user.get(), p.action().tool(), p.action().args());
            edit(chatId, messageId, "✓ " + p.action().label() + " — feito");
            remember(chatId, p.action().label() + ": confirmado e feito");
        } catch (Exception e) {
            pending.put(data.substring(3), p); // let them retry
            send(chatId, "Não deu certo: " + e.getMessage());
        }
    }

    private void remember(long chatId, String note) {
        Deque<AssistantService.ChatMessage> history = histories.get(chatId);
        if (history != null && !history.isEmpty() && "assistant".equals(history.peekLast().role())) {
            AssistantService.ChatMessage last = history.removeLast();
            history.addLast(new AssistantService.ChatMessage("assistant", last.content() + "\n(" + note + ")"));
        }
    }

    /** Largest photo, or a PDF/image document, as an assistant attachment. */
    private AssistantService.Attachment attachmentOf(JsonNode msg) throws IOException, InterruptedException {
        String fileId;
        String name;
        String mediaType;
        if (msg.path("photo").isArray() && !msg.path("photo").isEmpty()) {
            JsonNode photos = msg.path("photo");
            fileId = photos.get(photos.size() - 1).path("file_id").asText();
            name = "foto.jpg";
            mediaType = "image/jpeg";
        } else if (msg.has("document")) {
            fileId = msg.path("document").path("file_id").asText();
            name = msg.path("document").path("file_name").asText("arquivo");
            mediaType = msg.path("document").path("mime_type").asText("");
        } else {
            return null;
        }
        String path = callTelegram("getFile", json.createObjectNode().put("file_id", fileId)).path("result").path("file_path").asText();
        byte[] bytes = downloadFile(path);
        return new AssistantService.Attachment(name, mediaType, Base64.getEncoder().encodeToString(bytes));
    }

    private void send(long chatId, String text) {
        callTelegram("sendMessage", json.createObjectNode().put("chat_id", chatId).put("text", text));
    }

    private void edit(long chatId, int messageId, String text) {
        callTelegram("editMessageText", json.createObjectNode().put("chat_id", chatId).put("message_id", messageId).put("text", text));
    }

    /** The one place that calls the Bot API. Public so tests can stub it. */
    public JsonNode callTelegram(String method, ObjectNode body) {
        try {
            HttpResponse<String> res = Http.CLIENT.send(HttpRequest.newBuilder(URI.create("https://api.telegram.org/bot" + token + "/" + method))
                    .timeout(Duration.ofSeconds(30)).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(), HttpResponse.BodyHandlers.ofString());
            return json.readTree(res.body());
        } catch (IOException e) {
            log.warn("Telegram {} falhou: {}", method, e.getMessage());
            return json.createObjectNode();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return json.createObjectNode();
        }
    }

    public byte[] downloadFile(String path) throws IOException, InterruptedException {
        return Http.CLIENT.send(HttpRequest.newBuilder(URI.create("https://api.telegram.org/file/bot" + token + "/" + path))
                .timeout(Duration.ofSeconds(30)).GET().build(), HttpResponse.BodyHandlers.ofByteArray()).body();
    }
}
