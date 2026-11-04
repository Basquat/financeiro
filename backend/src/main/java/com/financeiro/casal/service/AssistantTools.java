package com.financeiro.casal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.financeiro.casal.controller.AccountController;
import com.financeiro.casal.controller.InstallmentPlanController;
import com.financeiro.casal.controller.RecurringController;
import com.financeiro.casal.controller.SharedGoalController;
import com.financeiro.casal.controller.TransactionController;
import com.financeiro.casal.controller.UserController;
import com.financeiro.casal.dto.AccountRequestDTO;
import com.financeiro.casal.dto.BudgetSettingsDTO;
import com.financeiro.casal.dto.InstallmentPlanRequestDTO;
import com.financeiro.casal.dto.SalaryUpdateDTO;
import com.financeiro.casal.dto.SharedGoalRequestDTO;
import com.financeiro.casal.dto.TransactionRequestDTO;
import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.InstallmentPlan;
import com.financeiro.casal.model.RecurringTransaction;
import com.financeiro.casal.model.SharedGoal;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.AccountRepository;
import com.financeiro.casal.repository.InstallmentPlanRepository;
import com.financeiro.casal.repository.SharedGoalRepository;
import com.financeiro.casal.repository.TransactionRepository;
import com.financeiro.casal.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * What the assistant can see and do. Write tools run the existing controllers (same validation,
 * sign rules and ownership checks as the REST API), but only through {@link #execute} — the chat
 * loop never calls a tool that {@link #needsConfirmation}; it turns it into a card the user confirms.
 */
@Service
@RequiredArgsConstructor
public class AssistantTools {

    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    static final int NOTES_MAX = 4000;

    public record Tool(String name, String label, String description, Map<String, Object> parameters,
                       boolean needsConfirmation, Runner runner) {}

    @FunctionalInterface
    public interface Runner {
        Object run(User user, ObjectNode args);
    }

    private final TransactionController transactions;
    private final AccountController accounts;
    private final InstallmentPlanController plans;
    private final SharedGoalController goals;
    private final UserController users;
    private final RecurringController recurring;
    private final RecurringService recurringService;
    private final TransactionService transactionService;
    private final AccountService accountService;
    private final InstallmentPlanService installmentPlanService;
    private final SharedGoalService sharedGoalService;
    private final UserService userService;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final InstallmentPlanRepository installmentPlanRepository;
    private final SharedGoalRepository sharedGoalRepository;
    private final UserRepository userRepository;
    private final ObjectMapper json;
    private final Validator validator;

    private final Map<String, Tool> catalog = new LinkedHashMap<>();

    @PostConstruct
    void register() {
        var tx = Map.<String, Object>of(
                "title", prop("string", "Descrição curta, ex.: Mercado Extra"),
                "amount", prop("number", "Valor em reais, positivo (o tipo define se é entrada ou saída)"),
                "transactionDate", prop("string", "Data AAAA-MM-DD (ou data e hora ISO)"),
                "type", Map.of("type", "string", "enum", List.of("INCOME", "EXPENSE"),
                        "description", "INCOME = entrada, EXPENSE = saída"),
                "category", prop("string", "Categoria curta, ex.: Mercado, Transporte, Salário"),
                "accountId", prop("integer", "id da conta (veja contas no retrato)"),
                "installmentCurrent", prop("integer", "Opcional: número desta parcela"),
                "installmentTotal", prop("integer", "Opcional: total de parcelas"));
        var account = Map.<String, Object>of(
                "name", prop("string", "Nome da conta, ex.: Nubank"),
                "isJoint", prop("boolean", "true se for conta conjunta, compartilhada com outra pessoa"),
                "creditCard", prop("boolean", "true se for cartão de crédito"),
                "closingDay", prop("integer", "Cartão: dia de fechamento da fatura"),
                "dueDay", prop("integer", "Cartão: dia de vencimento da fatura"));
        var plan = Map.<String, Object>of(
                "title", prop("string", "Descrição, ex.: Geladeira"),
                "totalAmount", prop("number", "Valor total da compra"),
                "dueDate", prop("string", "Próximo vencimento AAAA-MM-DD"),
                "category", prop("string", "Categoria curta"),
                "installmentsLeft", prop("integer", "Parcelas que faltam pagar"),
                "remainingAmount", prop("number", "Opcional: quanto ainda falta (padrão = total)"));
        var goal = Map.<String, Object>of(
                "title", prop("string", "Nome da meta, ex.: Viagem"),
                "targetAmount", prop("number", "Valor objetivo"),
                "deadline", prop("string", "Prazo AAAA-MM-DD"),
                "icon", Map.of("type", "string", "description", "Ícone",
                        "enum", List.of("Home", "Plane", "Shield", "Car", "PiggyBank", "Gift", "Heart", "Sparkles")));
        var budget = Map.<String, Object>of(
                "housingCost", prop("number", "Gasto mensal com moradia"),
                "householdSize", prop("integer", "Pessoas na casa"),
                "paysFood", prop("boolean", "Se paga a alimentação da casa"),
                "foodPerPerson", prop("number", "Gasto mensal de alimentação por pessoa"),
                "emergencySaved", prop("number", "Quanto já tem de reserva de emergência"),
                "usesHouseholdIncome", prop("boolean", "Planejar somando a renda de quem divide a conta conjunta"));
        var recurringProps = Map.<String, Object>of(
                "title", prop("string", "Descrição, ex.: Aluguel, Salário, Netflix"),
                "amount", prop("number", "Valor mensal em reais, positivo"),
                "type", Map.of("type", "string", "enum", List.of("INCOME", "EXPENSE"),
                        "description", "INCOME = entrada, EXPENSE = saída"),
                "category", prop("string", "Categoria curta"),
                "dayOfMonth", prop("integer", "Dia do mês em que acontece (1-31)"),
                "accountId", prop("integer", "id da conta"));
        var byId = Map.<String, Object>of("id", prop("integer", "id do registro"));

        // --- leitura / memória: rodam direto ---
        add("listar_lancamentos", "Consultar lançamentos",
                "Lista os lançamentos do usuário num período (use para meses fora do retrato).",
                obj(Map.of("inicio", prop("string", "AAAA-MM-DD"), "fim", prop("string", "AAAA-MM-DD")), "inicio", "fim"),
                false, this::listTransactions);
        add("lembrar", "Anotar",
                "Guarda um fato pessoal útil para as finanças (dia do pagamento, benefícios, contas fixas, objetivos).",
                obj(Map.of("nota", prop("string", "O fato, numa frase curta")), "nota"),
                false, this::remember);

        // --- escrita: viram card de confirmação ---
        add("criar_lancamento", "Novo lançamento", "Registra uma entrada ou saída.",
                obj(tx, "title", "amount", "transactionDate", "type", "category", "accountId"), true,
                (u, a) -> ok(transactions.createTransaction(u, valid(to(a, TransactionRequestDTO.class)))));
        add("editar_lancamento", "Editar lançamento", "Altera um lançamento; envie só o id e o que muda.",
                obj(with(tx, byId), "id"), true,
                (u, a) -> ok(transactions.updateTransaction(u, id(a), valid(merge(currentTx(id(a)), a)))));
        add("excluir_lancamento", "Excluir lançamento", "Exclui um lançamento.",
                obj(byId, "id"), true, (u, a) -> ok(transactions.deleteTransaction(u, id(a))));

        add("criar_conta", "Nova conta", "Cria uma conta (banco, carteira, cartão).",
                obj(account, "name", "isJoint"), true,
                (u, a) -> ok(accounts.createAccount(u, valid(to(a, AccountRequestDTO.class)))));
        add("editar_conta", "Editar conta", "Renomeia ou muda o tipo de uma conta; envie só o id e o que muda.",
                obj(with(account, byId), "id"), true,
                (u, a) -> ok(accounts.updateAccount(u, id(a), valid(merge(currentAccount(id(a)), a)))));
        add("excluir_conta", "Excluir conta", "Exclui uma conta sem lançamentos.",
                obj(byId, "id"), true, (u, a) -> ok(accounts.deleteAccount(u, id(a))));

        add("criar_parcelamento", "Novo parcelamento", "Registra uma compra parcelada.",
                obj(plan, "title", "totalAmount", "dueDate", "category", "installmentsLeft"), true,
                (u, a) -> ok(plans.create(u, valid(to(a, InstallmentPlanRequestDTO.class)))));
        add("editar_parcelamento", "Editar parcelamento", "Altera um parcelamento; envie só o id e o que muda.",
                obj(with(plan, byId), "id"), true,
                (u, a) -> ok(plans.update(u, id(a), valid(merge(currentPlan(id(a)), a)))));
        add("excluir_parcelamento", "Excluir parcelamento", "Exclui um parcelamento.",
                obj(byId, "id"), true, (u, a) -> ok(plans.delete(u, id(a))));
        add("pagar_parcela", "Pagar parcela",
                "Marca uma parcela como paga e, se informar a conta, lança a saída nela.",
                obj(with(byId, Map.of("accountId", prop("integer", "Opcional: conta de onde saiu o dinheiro"))), "id"), true,
                (u, a) -> ok(plans.pay(u, id(a), a.hasNonNull("accountId") ? a.get("accountId").asLong() : null)));

        add("criar_meta", "Nova meta", "Cria uma meta de economia.",
                obj(goal, "title", "targetAmount", "deadline"), true,
                (u, a) -> ok(goals.create(u, valid(to(a, SharedGoalRequestDTO.class)))));
        add("editar_meta", "Editar meta", "Altera uma meta; envie só o id e o que muda.",
                obj(with(goal, byId), "id"), true,
                (u, a) -> ok(goals.update(u, id(a), valid(merge(currentGoal(id(a)), a)))));
        add("excluir_meta", "Excluir meta", "Exclui uma meta.",
                obj(byId, "id"), true, (u, a) -> ok(goals.delete(u, id(a))));
        add("aportar_meta", "Guardar na meta", "Soma um valor ao que já foi guardado numa meta.",
                obj(with(byId, Map.of("amount", prop("number", "Valor guardado agora"))), "id", "amount"), true,
                (u, a) -> ok(goals.contributeToGoal(u, id(a), a.path("amount").asDouble())));

        add("transferir", "Transferência",
                "Move dinheiro entre duas contas do usuário. Pagar a fatura do cartão = transferir para a conta do cartão. "
                        + "Não conta como gasto nem como receita.",
                obj(Map.of("fromAccountId", prop("integer", "Conta de onde sai"),
                        "toAccountId", prop("integer", "Conta para onde vai"),
                        "amount", prop("number", "Valor em reais"),
                        "date", prop("string", "Opcional: AAAA-MM-DD")), "fromAccountId", "toAccountId", "amount"), true,
                (u, a) -> ok(transactions.transfer(u, valid(to(a, TransactionController.TransferRequest.class)))));

        add("criar_recorrente", "Nova conta fixa", "Cadastra algo que se repete todo mês (aluguel, salário, assinatura).",
                obj(recurringProps, "title", "amount", "type", "category", "dayOfMonth", "accountId"), true,
                (u, a) -> ok(recurring.create(u, valid(to(a, RecurringController.RecurringRequest.class)))));
        add("excluir_recorrente", "Excluir conta fixa", "Remove uma conta fixa (não apaga o que já foi lançado).",
                obj(byId, "id"), true, (u, a) -> ok(recurring.delete(u, id(a))));
        add("lancar_recorrente", "Lançar conta fixa do mês", "Lança a ocorrência deste mês de uma conta fixa pendente.",
                obj(byId, "id"), true, (u, a) -> ok(recurring.post(u, id(a))));

        add("definir_limites_categoria", "Limites por categoria",
                "Define o limite mensal de gasto por categoria; envie só as que mudam (0 remove o limite).",
                obj(Map.of("limites", Map.of("type", "object", "additionalProperties", Map.of("type", "number"),
                        "description", "Categoria → limite mensal em reais, ex.: {\"Mercado\": 900}")), "limites"), true,
                (u, a) -> {
                    Map<String, Double> merged = new HashMap<>(Objects.requireNonNullElse(
                            userService.getById(u.getId()).getCategoryBudgets(), Map.<String, Double>of()));
                    a.path("limites").fields().forEachRemaining(e -> merged.put(e.getKey(), e.getValue().asDouble()));
                    return ok(users.updateCategoryBudgets(u, merged));
                });

        add("atualizar_salario", "Atualizar salário", "Atualiza o salário mensal líquido.",
                obj(Map.of("salary", prop("number", "Salário mensal líquido")), "salary"), true,
                (u, a) -> ok(users.updateSalary(u, valid(to(a, SalaryUpdateDTO.class)))));
        add("atualizar_orcamento", "Atualizar orçamento",
                "Atualiza os dados de planejamento (aba Planejar); envie só o que muda.",
                obj(budget), true,
                (u, a) -> ok(users.updateBudget(u, merge(UserDTO.from(userService.getById(u.getId())).getBudget(), a))));
    }

    public List<Map<String, Object>> definitions() {
        return catalog.values().stream()
                .map(t -> Map.<String, Object>of("type", "function", "function", Map.of(
                        "name", t.name(), "description", t.description(), "parameters", t.parameters())))
                .toList();
    }

    public boolean needsConfirmation(String name) {
        Tool tool = catalog.get(name);
        return tool != null && tool.needsConfirmation();
    }

    public String label(String name) {
        Tool tool = catalog.get(name);
        return tool == null ? name : tool.label();
    }

    /** Runs a tool as {@code user}. Throws with a user-facing message when it can't. */
    public Object execute(User user, String name, JsonNode args) {
        Tool tool = catalog.get(name);
        if (tool == null) throw new RuntimeException("Ação desconhecida: " + name);
        ObjectNode a = args instanceof ObjectNode o ? o.deepCopy() : json.createObjectNode();
        for (String field : List.of("transactionDate", "date")) { // LocalDateTime fields: accept a bare date
            JsonNode date = a.get(field);
            if (date != null && date.asText().length() == 10) a.put(field, date.asText() + "T12:00:00");
        }
        return tool.runner().run(user, a);
    }

    /** Everything the assistant knows about the user up front, re-sent every turn. */
    public ObjectNode snapshot(User user) {
        User u = userService.getById(user.getId());
        ObjectNode s = json.createObjectNode();
        ObjectNode profile = s.putObject("perfil");
        profile.put("nome", u.getName());
        profile.put("salario", u.getSalary());
        profile.set("orcamento", json.valueToTree(UserDTO.from(u).getBudget()));
        s.put("anotacoes", u.getAiNotes());
        s.set("limitesPorCategoria", json.valueToTree(Objects.requireNonNullElse(u.getCategoryBudgets(), Map.of())));

        ArrayNode accountRows = s.putArray("contas");
        for (Account acc : accountService.getUserAccounts(u.getId())) {
            ObjectNode row = accountRows.addObject().put("id", acc.getId()).put("nome", acc.getName())
                    .put("conjunta", acc.getIsJoint()).put("saldo", accountService.balanceOf(acc.getId()));
            if (Boolean.TRUE.equals(acc.getCreditCard())) {
                row.put("cartaoDeCredito", true).put("fechamento", acc.getClosingDay()).put("vencimento", acc.getDueDay());
            }
        }
        ArrayNode goalRows = s.putArray("metas");
        for (SharedGoal g : sharedGoalService.getVisibleGoals(u)) {
            goalRows.addObject().put("id", g.getId()).put("titulo", g.getTitle()).put("objetivo", g.getTargetAmount())
                    .put("guardado", g.getCurrentAmount()).put("prazo", str(g.getDeadline()));
        }
        ArrayNode planRows = s.putArray("parcelamentos");
        for (InstallmentPlan p : installmentPlanService.getUserInstallmentPlans(u.getId())) {
            planRows.addObject().put("id", p.getId()).put("titulo", p.getTitle()).put("total", p.getTotalAmount())
                    .put("restante", p.getRemainingAmount()).put("parcelasRestantes", p.getInstallmentsLeft())
                    .put("vencimento", str(p.getDueDate())).put("categoria", p.getCategory());
        }
        ArrayNode recurringRows = s.putArray("contasFixas");
        for (RecurringTransaction r : recurringService.list(u.getId())) {
            recurringRows.addObject().put("id", r.getId()).put("titulo", r.getTitle()).put("valor", r.getAmount())
                    .put("tipo", r.getType().name()).put("dia", r.getDayOfMonth()).put("contaId", r.getAccount().getId())
                    .put("pendenteEsteMes", RecurringService.pendingThisMonth(r));
        }
        ArrayNode txRows = s.putArray("ultimosLancamentos");
        // ponytail: last 40 only; older months go through listar_lancamentos
        transactionService.getUserTransactions(u.getId()).stream().limit(40).forEach(t -> txRows.add(row(t)));
        return s;
    }

    // ---------- runners ----------

    private Object listTransactions(User user, ObjectNode a) {
        LocalDate from = LocalDate.parse(a.path("inicio").asText());
        LocalDate to = LocalDate.parse(a.path("fim").asText());
        return transactionService.getUserTransactions(user.getId()).stream()
                .filter(t -> {
                    LocalDate d = t.getTransactionDate().toLocalDate();
                    return !d.isBefore(from) && !d.isAfter(to);
                })
                .limit(300)
                .map(this::row)
                .toList();
    }

    private Object remember(User user, ObjectNode a) {
        String note = a.path("nota").asText("").strip();
        if (note.isEmpty()) throw new RuntimeException("Nota vazia");
        User u = userService.getById(user.getId());
        String notes = (u.getAiNotes() == null || u.getAiNotes().isBlank() ? "" : u.getAiNotes() + "\n") + "- " + note;
        if (notes.length() > NOTES_MAX) {
            // ponytail: drops the oldest lines past the cap; summarize them if users hit it often
            int cut = notes.indexOf('\n', notes.length() - NOTES_MAX);
            notes = cut < 0 ? notes.substring(notes.length() - NOTES_MAX) : notes.substring(cut + 1);
        }
        u.setAiNotes(notes);
        userRepository.save(u);
        return Map.of("anotado", note);
    }

    // ---------- current values, so edits only need what changes ----------

    private TransactionRequestDTO currentTx(long id) {
        Transaction t = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));
        return TransactionRequestDTO.builder()
                .title(t.getTitle())
                .amount(Math.abs(t.getAmount()))
                .transactionDate(t.getTransactionDate())
                .type(t.getType() == Transaction.TransactionType.INCOME
                        ? TransactionRequestDTO.TransactionType.INCOME
                        : TransactionRequestDTO.TransactionType.EXPENSE)
                .category(t.getCategory())
                .accountId(t.getAccount().getId())
                .installmentCurrent(t.getInstallmentCurrent())
                .installmentTotal(t.getInstallmentTotal())
                .build();
    }

    private AccountRequestDTO currentAccount(long id) {
        Account a = accountRepository.findById(id).orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        return AccountRequestDTO.builder().name(a.getName()).isJoint(a.getIsJoint()).creditCard(a.getCreditCard())
                .closingDay(a.getClosingDay()).dueDay(a.getDueDay()).build();
    }

    private InstallmentPlanRequestDTO currentPlan(long id) {
        InstallmentPlan p = installmentPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcelamento não encontrado"));
        return new InstallmentPlanRequestDTO(p.getTitle(), p.getTotalAmount(), p.getDueDate(), p.getCategory(),
                p.getInstallmentsLeft(), p.getRemainingAmount());
    }

    private SharedGoalRequestDTO currentGoal(long id) {
        SharedGoal g = sharedGoalRepository.findById(id).orElseThrow(() -> new RuntimeException("Meta não encontrada"));
        return new SharedGoalRequestDTO(g.getTitle(), g.getTargetAmount(), g.getDeadline(), g.getIcon());
    }

    // ---------- helpers ----------

    private void add(String name, String label, String description, Map<String, Object> parameters,
                     boolean needsConfirmation, Runner runner) {
        catalog.put(name, new Tool(name, label, description, parameters, needsConfirmation, runner));
    }

    private ObjectNode row(Transaction t) {
        return json.createObjectNode().put("id", t.getId()).put("data", str(t.getTransactionDate().toLocalDate()))
                .put("titulo", t.getTitle()).put("valor", t.getAmount()).put("categoria", t.getCategory())
                .put("contaId", t.getAccount().getId()).put("conta", t.getAccount().getName());
    }

    private <T> T to(ObjectNode args, Class<T> type) {
        try {
            return json.treeToValue(args, type);
        } catch (IOException e) {
            throw new RuntimeException("Dados inválidos: " + e.getMessage());
        }
    }

    private <T> T merge(T current, ObjectNode changes) {
        ObjectNode patch = changes.deepCopy();
        patch.remove("id");
        try {
            return json.readerForUpdating(current).readValue(patch);
        } catch (IOException e) {
            throw new RuntimeException("Dados inválidos: " + e.getMessage());
        }
    }

    private <T> T valid(T dto) {
        Set<ConstraintViolation<T>> errors = validator.validate(dto);
        if (!errors.isEmpty()) throw new RuntimeException(errors.iterator().next().getMessage());
        return dto;
    }

    private static Object ok(ResponseEntity<?> res) {
        if (res.getStatusCode().is2xxSuccessful()) return res.getBody();
        Object body = res.getBody();
        throw new RuntimeException(body instanceof Map<?, ?> m && m.get("error") != null
                ? m.get("error").toString() : "Não foi possível concluir");
    }

    private static long id(ObjectNode a) {
        if (!a.hasNonNull("id")) throw new RuntimeException("Informe o id do registro");
        return a.get("id").asLong();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static Map<String, Object> prop(String type, String description) {
        return Map.of("type", type, "description", description);
    }

    private static Map<String, Object> obj(Map<String, Object> properties, String... required) {
        return Map.of("type", "object", "properties", properties, "required", List.of(required));
    }

    private static Map<String, Object> with(Map<String, Object> a, Map<String, Object> b) {
        var all = new HashMap<>(a);
        all.putAll(b);
        return all;
    }
}
