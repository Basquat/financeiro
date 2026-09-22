package com.financeiro.casal.controller;

import com.financeiro.casal.dto.AccountSummaryDTO;
import com.financeiro.casal.dto.TransactionDTO;
import com.financeiro.casal.dto.TransactionRequestDTO;
import com.financeiro.casal.dto.UserSummaryDTO;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.TransactionService;
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
                                               @RequestBody TransactionRequestDTO request) {
        try {
            Long userId = request.getUserId() != null ? request.getUserId() : currentUser.getId();
            Transaction saved = transactionService.createTransaction(
                    fromRequest(request), userId, request.getAccountId());
            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(@AuthenticationPrincipal User currentUser,
                                               @PathVariable Long id,
                                               @RequestBody TransactionRequestDTO request) {
        try {
            Transaction updated = transactionService.updateTransaction(
                    id, fromRequest(request), request.getAccountId(), currentUser);
            return ResponseEntity.ok(toDTO(updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@AuthenticationPrincipal User currentUser,
                                               @PathVariable Long id) {
        try {
            transactionService.deleteTransaction(id, currentUser);
            return ResponseEntity.ok(Map.of("message", "Lançamento excluído"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserTransactions(@AuthenticationPrincipal User currentUser,
                                                 @PathVariable Long userId) {
        if (!currentUser.getId().equals(userId)) return forbidden();
        try {
            return ResponseEntity.ok(transactionService.getUserTransactions(userId).stream().map(this::toDTO).toList());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/balance/{userId}")
    public ResponseEntity<?> getUserBalance(@AuthenticationPrincipal User currentUser, @PathVariable Long userId) {
        if (!currentUser.getId().equals(userId)) return forbidden();
        try {
            return ResponseEntity.ok(Map.of("balance", transactionService.getUserBalance(userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/monthly")
    public ResponseEntity<?> getMonthlyTransactions(@AuthenticationPrincipal User currentUser,
                                                    @PathVariable Long userId,
                                                    @RequestParam int year,
                                                    @RequestParam int month) {
        if (!currentUser.getId().equals(userId)) return forbidden();
        try {
            LocalDateTime start = LocalDateTime.of(year, month, 1, 0, 0, 0);
            LocalDateTime end = start.plusMonths(1).minusSeconds(1);
            return ResponseEntity.ok(
                    transactionService.getTransactionsByDateRange(userId, start, end).stream().map(this::toDTO).toList());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403).body(Map.of("error", "Acesso negado"));
    }

    private Transaction fromRequest(TransactionRequestDTO request) {
        Transaction tx = Transaction.builder()
                .title(request.getTitle())
                .amount(request.getAmount())
                .transactionDate(request.getTransactionDate())
                .type(request.getType() == TransactionRequestDTO.TransactionType.INCOME
                        ? Transaction.TransactionType.INCOME
                        : Transaction.TransactionType.EXPENSE)
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
