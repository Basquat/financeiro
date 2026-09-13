package com.financeiro.casal.controller;

import com.financeiro.casal.dto.InstallmentPlanDTO;
import com.financeiro.casal.dto.InstallmentPlanRequestDTO;
import com.financeiro.casal.dto.UserSummaryDTO;
import com.financeiro.casal.model.InstallmentPlan;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.InstallmentPlanService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/installment-plans")
@AllArgsConstructor
public class InstallmentPlanController {

    private final InstallmentPlanService installmentPlanService;

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User currentUser,
                                    @RequestBody InstallmentPlanRequestDTO request) {
        try {
            Long userId = request.getUserId() != null ? request.getUserId() : currentUser.getId();
            InstallmentPlan saved = installmentPlanService.createInstallmentPlan(fromRequest(request), userId);
            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserInstallmentPlans(@AuthenticationPrincipal User currentUser,
                                                     @PathVariable Long userId) {
        if (!currentUser.getId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Acesso negado"));
        }
        try {
            return ResponseEntity.ok(
                    installmentPlanService.getUserInstallmentPlans(userId).stream().map(this::toDTO).toList());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal User currentUser,
                                    @PathVariable Long id,
                                    @RequestBody InstallmentPlanRequestDTO request) {
        try {
            return ResponseEntity.ok(toDTO(installmentPlanService.updatePlan(id, fromRequest(request), currentUser)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        try {
            installmentPlanService.deletePlan(id, currentUser);
            return ResponseEntity.ok(Map.of("message", "Parcelamento excluído"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<?> pay(@AuthenticationPrincipal User currentUser,
                                 @PathVariable Long id,
                                 @RequestParam(required = false) Long accountId) {
        try {
            return ResponseEntity.ok(toDTO(installmentPlanService.payInstallment(id, accountId, currentUser)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private InstallmentPlan fromRequest(InstallmentPlanRequestDTO request) {
        return InstallmentPlan.builder()
                .title(request.getTitle())
                .totalAmount(request.getTotalAmount())
                .remainingAmount(request.getRemainingAmount())
                .installmentsLeft(request.getInstallmentsLeft())
                .dueDate(request.getDueDate())
                .category(request.getCategory())
                .build();
    }

    private InstallmentPlanDTO toDTO(InstallmentPlan plan) {
        return InstallmentPlanDTO.builder()
                .id(plan.getId())
                .title(plan.getTitle())
                .totalAmount(plan.getTotalAmount())
                .remainingAmount(plan.getRemainingAmount())
                .installmentsLeft(plan.getInstallmentsLeft())
                .dueDate(plan.getDueDate())
                .category(plan.getCategory())
                .user(plan.getUser() == null ? null : UserSummaryDTO.builder()
                        .id(plan.getUser().getId())
                        .name(plan.getUser().getName())
                        .avatarUrl(plan.getUser().getAvatarUrl())
                        .build())
                .build();
    }
}
