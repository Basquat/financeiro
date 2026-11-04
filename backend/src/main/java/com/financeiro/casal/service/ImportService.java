package com.financeiro.casal.service;

import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.AccountRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Bank statement import (OFX, which every Brazilian bank exports): preview, then commit the chosen rows. */
@Service
@AllArgsConstructor
public class ImportService {

    public record Row(String date, String title, double amount, String category, boolean duplicate) {}

    public record CommitRow(String date, String title, Double amount, String category) {}

    static final int MAX_BYTES = 5 * 1024 * 1024;
    static final int MAX_ROWS = 1000;

    // ponytail: keyword guess, first match wins; let the assistant categorize if users import a lot
    private static final Map<Pattern, String> KEYWORDS = new LinkedHashMap<>();

    static {
        KEYWORDS.put(kw("SALARIO|PAGTO SAL|PROVENTOS|FOLHA"), "Salário");
        KEYWORDS.put(kw("UBER|99APP|99 ?POP|99 ?TAXI|CABIFY|POSTO|SHELL|IPIRANGA|PETROBRAS|ESTACIONA|PEDAGIO|SEM PARAR|METRO|BILHETE UNICO"), "Transporte");
        KEYWORDS.put(kw("IFOOD|RAPPI|RESTAURANTE|LANCHONETE|PADARIA|BURGER|PIZZ|MC ?DONALD|STARBUCKS|CAFETERIA"), "Alimentação");
        KEYWORDS.put(kw("MERCADO|SUPERMERC|ATACAD|CARREFOUR|ASSAI|PAO DE ACUCAR|HORTIFRUTI"), "Mercado");
        KEYWORDS.put(kw("FARMACIA|DROGA|RAIA|PACHECO|HOSPITAL|CLINICA|LABORATORIO|UNIMED|AMIL"), "Saúde");
        KEYWORDS.put(kw("NETFLIX|SPOTIFY|DISNEY|HBO|PRIME VIDEO|AMAZON PRIME|DEEZER|YOUTUBE|GLOBOPLAY"), "Streaming");
        KEYWORDS.put(kw("ALUGUEL|CONDOMINIO|IPTU"), "Moradia");
        KEYWORDS.put(kw("ENEL|CEMIG|COPEL|SABESP|ENERGIA|SANEAMENTO|CLARO|VIVO|TIM |INTERNET|COMGAS"), "Utilidades");
        KEYWORDS.put(kw("ESCOLA|FACULDADE|UNIVERSIDADE|CURSO|UDEMY|ALURA|LIVRARIA"), "Educação");
        KEYWORDS.put(kw("CINEMA|INGRESSO|STEAM|PLAYSTATION|XBOX|NINTENDO"), "Lazer");
    }

    private final TransactionService transactionService;
    private final AccountRepository accountRepository;

    public List<Row> previewOfx(String base64, Long accountId, User actor) {
        ownedAccount(accountId, actor);
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(base64 == null ? "" : base64.substring(base64.indexOf(',') + 1));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Arquivo inválido");
        }
        if (bytes.length == 0) throw new RuntimeException("Arquivo vazio");
        if (bytes.length > MAX_BYTES) throw new RuntimeException("Arquivo muito grande (máx. 5 MB)");

        Set<String> existing = transactionService.getAccountTransactions(accountId).stream()
                .map(t -> key(t.getTransactionDate().toLocalDate().toString(), t.getAmount(), t.getTitle()))
                .collect(Collectors.toSet());
        List<Row> rows = parseOfx(decode(bytes)).stream()
                .map(r -> new Row(r.date(), r.title(), r.amount(), r.category(), existing.contains(key(r.date(), r.amount(), r.title()))))
                .toList();
        if (rows.isEmpty()) throw new RuntimeException("Não encontrei lançamentos nesse arquivo. Ele é um extrato OFX?");
        return rows;
    }

    @Transactional
    public int commit(Long accountId, List<CommitRow> rows, User actor) {
        if (rows == null || rows.isEmpty()) throw new RuntimeException("Nenhum lançamento selecionado");
        if (rows.size() > MAX_ROWS) throw new RuntimeException("Importe no máximo " + MAX_ROWS + " lançamentos por vez");
        for (CommitRow r : rows) {
            if (r.amount() == null || r.amount() == 0 || !Double.isFinite(r.amount())) throw new RuntimeException("Valor inválido em " + r.title());
            String title = r.title() == null || r.title().isBlank() ? "Lançamento importado" : r.title().strip();
            String category = r.category() == null || r.category().isBlank() ? "Outros" : r.category().strip();
            if (category.length() > 100) throw new RuntimeException("Categoria muito longa");
            double amount = Math.round(r.amount() * 100.0) / 100.0;
            Transaction tx = Transaction.builder()
                    .title(title.length() > 200 ? title.substring(0, 200) : title)
                    .amount(amount)
                    .transactionDate(LocalDate.parse(r.date()).atTime(12, 0))
                    .type(amount > 0 ? Transaction.TransactionType.INCOME : Transaction.TransactionType.EXPENSE)
                    .category(category)
                    .build();
            transactionService.createTransaction(tx, actor.getId(), accountId);
        }
        return rows.size();
    }

    /** OFX is SGML: closing tags are optional, so read each field up to the next tag or line break. */
    static List<Row> parseOfx(String text) {
        List<Row> rows = new ArrayList<>();
        String[] blocks = text.split("(?i)<STMTTRN>");
        for (int i = 1; i < blocks.length; i++) {
            String block = blocks[i].split("(?i)</STMTTRN>")[0];
            String rawAmount = field(block, "TRNAMT");
            String rawDate = field(block, "DTPOSTED");
            if (rawAmount == null || rawDate == null || rawDate.length() < 8) continue;
            double amount;
            try {
                amount = Double.parseDouble(rawAmount.contains(",") ? rawAmount.replace(".", "").replace(",", ".") : rawAmount);
            } catch (NumberFormatException e) {
                continue;
            }
            if (amount == 0) continue;
            String date = LocalDate.parse(rawDate.substring(0, 8), DateTimeFormatter.BASIC_ISO_DATE).toString();
            String memo = Objects.requireNonNullElse(field(block, "MEMO"), Objects.requireNonNullElse(field(block, "NAME"), ""));
            String title = memo.replaceAll("\\s+", " ").strip();
            if (title.isEmpty()) title = amount > 0 ? "Entrada" : "Saída";
            rows.add(new Row(date, title, Math.round(amount * 100.0) / 100.0, guessCategory(title, amount), false));
        }
        return rows;
    }

    static String guessCategory(String title, double amount) {
        String normalized = normalize(title);
        for (Map.Entry<Pattern, String> e : KEYWORDS.entrySet()) {
            if (e.getKey().matcher(normalized).find()) return e.getValue();
        }
        return "Outros";
    }

    private static String field(String block, String tag) {
        Matcher m = Pattern.compile("(?i)<" + tag + ">\\s*([^<\\r\\n]+)").matcher(block);
        return m.find() ? m.group(1).strip() : null;
    }

    /** OFX headers declare the charset; Brazilian banks mostly send windows-1252. */
    private static String decode(byte[] bytes) {
        String head = new String(bytes, 0, Math.min(bytes.length, 400), StandardCharsets.ISO_8859_1).toUpperCase(Locale.ROOT);
        Charset cs = head.contains("UTF-8") || head.contains("CHARSET:UTF") ? StandardCharsets.UTF_8 : Charset.forName("windows-1252");
        return new String(bytes, cs);
    }

    private static String key(String date, double amount, String title) {
        return date + "|" + Math.round(amount * 100) + "|" + normalize(title);
    }

    private static String normalize(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT).replaceAll("\\s+", " ").strip();
    }

    private static Pattern kw(String alternatives) {
        return Pattern.compile("\\b(" + alternatives + ")");
    }

    private void ownedAccount(Long accountId, User actor) {
        Account account = accountRepository.findById(accountId == null ? -1L : accountId)
                .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!account.isOwnedBy(actor.getId())) throw new RuntimeException("Conta não encontrada");
    }
}
