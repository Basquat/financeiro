package com.financeiro.casal.controller;

import com.financeiro.casal.dto.SharedGoalDTO;
import com.financeiro.casal.dto.SharedGoalRequestDTO;
import com.financeiro.casal.model.SharedGoal;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.SharedGoalService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/shared-goals")
@AllArgsConstructor
public class SharedGoalController {

    private final SharedGoalService sharedGoalService;

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User user, @RequestBody SharedGoalRequestDTO request) {
        try {
            return ResponseEntity.ok(toDTO(sharedGoalService.createSharedGoal(fromRequest(request), user)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getSharedGoals(@AuthenticationPrincipal User user) {
        try {
            return ResponseEntity.ok(sharedGoalService.getVisibleGoals(user).stream().map(this::toDTO).toList());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{goalId}")
    public ResponseEntity<?> update(@AuthenticationPrincipal User user,
                                    @PathVariable Long goalId,
                                    @RequestBody SharedGoalRequestDTO request) {
        try {
            return ResponseEntity.ok(toDTO(sharedGoalService.updateGoal(goalId, fromRequest(request), user)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{goalId}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable Long goalId) {
        try {
            sharedGoalService.deleteGoal(goalId, user);
            return ResponseEntity.ok(Map.of("message", "Meta excluída"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{goalId}/contribute")
    public ResponseEntity<?> contributeToGoal(@AuthenticationPrincipal User user,
                                              @PathVariable Long goalId,
                                              @RequestParam Double amount) {
        try {
            return ResponseEntity.ok(toDTO(sharedGoalService.contributeToGoal(goalId, amount, user)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private SharedGoal fromRequest(SharedGoalRequestDTO request) {
        return SharedGoal.builder()
                .title(request.getTitle())
                .targetAmount(request.getTargetAmount())
                .deadline(request.getDeadline())
                .icon(request.getIcon())
                .build();
    }

    private SharedGoalDTO toDTO(SharedGoal goal) {
        return SharedGoalDTO.builder()
                .id(goal.getId())
                .title(goal.getTitle())
                .targetAmount(goal.getTargetAmount())
                .currentAmount(goal.getCurrentAmount())
                .deadline(goal.getDeadline())
                .icon(goal.getIcon())
                .build();
    }
}
