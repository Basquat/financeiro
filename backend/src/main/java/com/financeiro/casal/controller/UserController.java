package com.financeiro.casal.controller;

import com.financeiro.casal.config.ApiErrorHandler;
import com.financeiro.casal.dto.BudgetSettingsDTO;
import com.financeiro.casal.dto.EmailChangeConfirmDTO;
import com.financeiro.casal.dto.EmailChangeRequestDTO;
import com.financeiro.casal.dto.SalaryUpdateDTO;
import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.model.User;
import com.financeiro.casal.security.JwtService;
import com.financeiro.casal.service.EmailChangeService;
import com.financeiro.casal.service.PrivacyService;
import com.financeiro.casal.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@AllArgsConstructor
public class UserController {

    private final UserService userService;
    private final EmailChangeService emailChangeService;
    private final JwtService jwtService;
    private final PrivacyService privacyService;

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserDTO.from(userService.getById(user.getId())));
    }

    @PutMapping("/me/salary")
    public ResponseEntity<?> updateSalary(@AuthenticationPrincipal User user,
                                          @Valid @RequestBody SalaryUpdateDTO request) {
        try {
            return ResponseEntity.ok(UserDTO.from(userService.updateSalary(user.getId(), request.getSalary())));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PutMapping("/me/avatar")
    public ResponseEntity<?> updateAvatar(@AuthenticationPrincipal User user,
                                          @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(UserDTO.from(userService.updateAvatar(user.getId(), body.get("avatarUrl"))));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PutMapping("/me/budget")
    public ResponseEntity<?> updateBudget(@AuthenticationPrincipal User user,
                                          @RequestBody BudgetSettingsDTO request) {
        try {
            return ResponseEntity.ok(UserDTO.from(userService.updateBudget(user.getId(), request)));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PutMapping("/me/category-budgets")
    public ResponseEntity<?> updateCategoryBudgets(@AuthenticationPrincipal User user,
                                                   @RequestBody Map<String, Double> limits) {
        try {
            return ResponseEntity.ok(UserDTO.from(userService.updateCategoryBudgets(user.getId(), limits)));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    /** LGPD portability: all of the user's data as JSON. */
    @GetMapping("/me/export")
    public ResponseEntity<?> export(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"meus-dados.json\"")
                .body(privacyService.export(user));
    }

    /** POST (not DELETE) so the password confirmation travels in a body every proxy keeps. */
    @PostMapping("/me/delete")
    public ResponseEntity<?> deleteAccount(@AuthenticationPrincipal User user, @RequestBody Map<String, String> body) {
        try {
            privacyService.deleteAccount(user, body.get("password"));
            return ResponseEntity.ok(Map.of("message", "Conta excluída"));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PostMapping("/me/email/request")
    public ResponseEntity<?> requestEmailChange(@AuthenticationPrincipal User user,
                                                @Valid @RequestBody EmailChangeRequestDTO request) {
        try {
            emailChangeService.requestChange(user, request.getNewEmail());
            return ResponseEntity.ok(Map.of(
                    "message", "Enviamos um código de verificação para " + request.getNewEmail()));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PostMapping("/me/email/confirm")
    public ResponseEntity<?> confirmEmailChange(@AuthenticationPrincipal User user,
                                                @Valid @RequestBody EmailChangeConfirmDTO request) {
        try {
            User updated = emailChangeService.confirmChange(user, request.getCode());
            return ResponseEntity.ok(Map.of(
                    "user", UserDTO.from(updated),
                    "token", jwtService.generateToken(updated),
                    "message", "E-mail alterado com sucesso"));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }
}
