package com.financeiro.casal.controller;

import com.financeiro.casal.dto.AccountDTO;
import com.financeiro.casal.dto.AccountRequestDTO;
import com.financeiro.casal.dto.UserSummaryDTO;
import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.AccountService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@AllArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<?> getMyAccounts(@AuthenticationPrincipal User currentUser) {
        try {
            List<AccountDTO> dtos = accountService.getUserAccounts(currentUser.getId()).stream()
                    .map(this::toDTO).toList();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createAccount(@AuthenticationPrincipal User currentUser,
                                           @RequestBody AccountRequestDTO request) {
        try {
            Account account = Account.builder()
                    .name(request.getName())
                    .isJoint(request.getIsJoint())
                    .currentBalance(0.0)
                    .build();
            return ResponseEntity.ok(toDTO(accountService.createAccount(account, currentUser.getId())));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAccount(@AuthenticationPrincipal User currentUser,
                                           @PathVariable Long id,
                                           @RequestBody AccountRequestDTO request) {
        try {
            Account updated = accountService.updateAccount(id, request.getName(), request.getIsJoint(), currentUser);
            return ResponseEntity.ok(toDTO(updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAccount(@AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        try {
            accountService.deleteAccount(id, currentUser);
            return ResponseEntity.ok(Map.of("message", "Conta excluída"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private AccountDTO toDTO(Account account) {
        return AccountDTO.builder()
                .id(account.getId())
                .name(account.getName())
                .isJoint(account.getIsJoint())
                .currentBalance(account.getCurrentBalance())
                .owners(account.getOwners() == null ? List.of() : account.getOwners().stream()
                        .map(owner -> UserSummaryDTO.builder()
                                .id(owner.getId())
                                .name(owner.getName())
                                .avatarUrl(owner.getAvatarUrl())
                                .build())
                        .toList())
                .build();
    }
}
