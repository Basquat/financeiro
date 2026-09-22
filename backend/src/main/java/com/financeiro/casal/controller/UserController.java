package com.financeiro.casal.controller;

import com.financeiro.casal.dto.BudgetSettingsDTO;
import com.financeiro.casal.dto.EmailChangeConfirmDTO;
import com.financeiro.casal.dto.EmailChangeRequestDTO;
import com.financeiro.casal.dto.SalaryUpdateDTO;
import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.model.User;
import com.financeiro.casal.security.JwtService;
import com.financeiro.casal.service.EmailChangeService;
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/me/avatar")
    public ResponseEntity<?> updateAvatar(@AuthenticationPrincipal User user,
                                          @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(UserDTO.from(userService.updateAvatar(user.getId(), body.get("avatarUrl"))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/me/budget")
    public ResponseEntity<?> updateBudget(@AuthenticationPrincipal User user,
                                          @RequestBody BudgetSettingsDTO request) {
        try {
            return ResponseEntity.ok(UserDTO.from(userService.updateBudget(user.getId(), request)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
