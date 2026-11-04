package com.financeiro.casal.controller;

import com.financeiro.casal.config.ApiErrorHandler;
import com.financeiro.casal.dto.AccountSummaryDTO;
import com.financeiro.casal.dto.TransactionDTO;
import com.financeiro.casal.dto.TransactionRequestDTO;
import com.financeiro.casal.dto.UserSummaryDTO;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.TransactionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@AllArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<?> createTransaction(@AuthenticationPrincipal User currentUser,
                                               @Valid @RequestBody TransactionRequestDTO request) {
        try {
            Transaction saved = transactionService.createTransaction(
                    fromRequest(request), currentUser.getId(), request.getAccountId());
            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(@AuthenticationPrincipal User currentUser,
                                               @PathVariable Long id,
                                               @Valid @RequestBody TransactionRequestDTO request) {
        try {
            Transaction updated = transactionService.updateTransaction(
                    id, fromRequest(request), request.getAccountId(), currentUser);
            return ResponseEntity.ok(toDTO(updated));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@AuthenticationPrincipal User currentUser,
                                               @PathVariable Long id) {
        try {
            transactionService.deleteTransaction(id, currentUser);
            return ResponseEntity.ok(Map.of("message", "Lançamento excluído"));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    public record TransferRequest(
            @NotNull(message = "Conta de origem é obrigatória") Long fromAccountId,
            @NotNull(message = "Conta de destino é obrigatória") Long toAccountId,
            @NotNull(message = "Valor é obrigatório") @Positive(message = "Valor deve ser positivo")
            @Digits(integer = 12, fraction = 2, message = "Valor inválido (máx. 2 casas decimais)") Double amount,
            LocalDateTime date) {}

    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(@AuthenticationPrincipal User currentUser, @Valid @RequestBody TransferRequest request) {
        try {
            return ResponseEntity.ok(transactionService.transfer(request.fromAccountId(), request.toAccountId(),
                    request.amount(), request.date(), currentUser).stream().map(this::toDTO).toList());
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserTransactions(@AuthenticationPrincipal User currentUser,
                                                 @PathVariable Long userId) {
        if (!currentUser.getId().equals(userId)) return forbidden();
        try {
            return ResponseEntity.ok(transactionService.getUserTransactions(userId).stream().map(this::toDTO).toList());
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @GetMapping("/balance/{userId}")
    public ResponseEntity<?> getUserBalance(@AuthenticationPrincipal User currentUser, @PathVariable Long userId) {
        if (!currentUser.getId().equals(userId)) return forbidden();
        try {
            return ResponseEntity.ok(Map.of("balance", transactionService.getUserBalance(userId)));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403).body(Map.of("error", "Acesso negado"));
    }

    private Transaction fromRequest(TransactionRequestDTO request) {
        boolean income = request.getType() == TransactionRequestDTO.TransactionType.INCOME;
        Transaction tx = Transaction.builder()
                .title(request.getTitle())
                // the sign follows the type, never the client: expenses negative, income positive
                .amount(income ? Math.abs(request.getAmount()) : -Math.abs(request.getAmount()))
                .transactionDate(request.getTransactionDate())
                .type(income ? Transaction.TransactionType.INCOME : Transaction.TransactionType.EXPENSE)
                .category(request.getCategory())
                .build();
        tx.setInstallmentCurrent(request.getInstallmentCurrent());
        tx.setInstallmentTotal(request.getInstallmentTotal());
        return tx;
    }

    private TransactionDTO toDTO(Transaction t) {
        return TransactionDTO.builder()
                .id(t.getId())
                .title(t.getTitle())
                .amount(t.getAmount())
                .transactionDate(t.getTransactionDate())
                .type(t.getType() == Transaction.TransactionType.INCOME
                        ? TransactionDTO.TransactionType.INCOME
                        : TransactionDTO.TransactionType.EXPENSE)
                .category(t.getCategory())
                .installmentCurrent(t.getInstallmentCurrent())
                .installmentTotal(t.getInstallmentTotal())
                .user(t.getUser() == null ? null : UserSummaryDTO.builder()
                        .id(t.getUser().getId())
                        .name(t.getUser().getName())
                        .avatarUrl(t.getUser().getAvatarUrl())
                        .build())
                .account(t.getAccount() == null ? null : AccountSummaryDTO.builder()
                        .id(t.getAccount().getId())
                        .name(t.getAccount().getName())
                        .isJoint(t.getAccount().getIsJoint())
                        .build())
                .build();
    }
}
