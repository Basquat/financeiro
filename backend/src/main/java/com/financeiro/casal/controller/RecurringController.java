package com.financeiro.casal.controller;

import com.financeiro.casal.config.ApiErrorHandler;
import com.financeiro.casal.model.RecurringTransaction;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.RecurringService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recurring")
@AllArgsConstructor
public class RecurringController {

    private final RecurringService recurringService;

    public record RecurringRequest(
            @NotBlank(message = "Título é obrigatório") @Size(max = 200, message = "Título deve ter no máximo 200 caracteres") String title,
            @NotNull(message = "Valor é obrigatório") @Positive(message = "Valor deve ser positivo")
            @Digits(integer = 12, fraction = 2, message = "Valor inválido (máx. 2 casas decimais)") Double amount,
            @NotNull(message = "Tipo é obrigatório") Transaction.TransactionType type,
            @NotBlank(message = "Categoria é obrigatória") @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres") String category,
            @NotNull(message = "Dia do mês é obrigatório") @Min(value = 1, message = "Dia entre 1 e 31")
            @Max(value = 31, message = "Dia entre 1 e 31") Integer dayOfMonth,
            @NotNull(message = "Conta é obrigatória") Long accountId) {}

    public record RecurringDTO(Long id, String title, Double amount, Transaction.TransactionType type, String category,
                               Integer dayOfMonth, Long accountId, String accountName, boolean pendingThisMonth) {
        static RecurringDTO from(RecurringTransaction r) {
            return new RecurringDTO(r.getId(), r.getTitle(), r.getAmount(), r.getType(), r.getCategory(), r.getDayOfMonth(),
                    r.getAccount().getId(), r.getAccount().getName(), RecurringService.pendingThisMonth(r));
        }
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(recurringService.list(user.getId()).stream().map(RecurringDTO::from).toList());
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User user, @Valid @RequestBody RecurringRequest req) {
        try {
            return ResponseEntity.ok(RecurringDTO.from(recurringService.create(fromRequest(req), req.accountId(), user)));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal User user, @PathVariable Long id,
                                    @Valid @RequestBody RecurringRequest req) {
        try {
            return ResponseEntity.ok(RecurringDTO.from(recurringService.update(id, fromRequest(req), req.accountId(), user)));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        try {
            recurringService.delete(id, user);
            return ResponseEntity.ok(Map.of("message", "Recorrência excluída"));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    /** Books this month's occurrence as a regular transaction. */
    @PostMapping("/{id}/post")
    public ResponseEntity<?> post(@AuthenticationPrincipal User user, @PathVariable Long id) {
        try {
            Transaction tx = recurringService.post(id, user);
            return ResponseEntity.ok(Map.of("message", "Lançado", "transactionId", tx.getId()));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    private static RecurringTransaction fromRequest(RecurringRequest req) {
        return RecurringTransaction.builder()
                .title(req.title().strip())
                .amount(Math.abs(req.amount()))
                .type(req.type())
                .category(req.category().strip())
                .dayOfMonth(req.dayOfMonth())
                .build();
    }
}
