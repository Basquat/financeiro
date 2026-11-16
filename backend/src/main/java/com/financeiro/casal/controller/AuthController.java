package com.financeiro.casal.controller;

import com.financeiro.casal.config.ApiErrorHandler;
import com.financeiro.casal.dto.PinLoginRequest;
import com.financeiro.casal.dto.PinRequest;
import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.dto.UserLoginDTO;
import com.financeiro.casal.dto.UserRegistrationDTO;
import com.financeiro.casal.model.User;
import com.financeiro.casal.security.JwtService;
import com.financeiro.casal.service.AccountCodeService;
import com.financeiro.casal.service.AuthService;
import com.financeiro.casal.service.PinService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@AllArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final PinService pinService;
    private final AccountCodeService codes;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRegistrationDTO request) {
        try {
            User user = authService.registerUser(
                    request.getEmail(),
                    request.getPassword(),
                    request.getName(),
                    !codes.required()
            );
            if (AccountCodeService.unverified(user)) {
                codes.send(user, AccountCodeService.VERIFY);
                return ResponseEntity.ok(Map.of("verificationRequired", true, "email", user.getEmail()));
            }
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(user),
                    "token", jwtService.generateToken(user)
            ));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody UserLoginDTO request) {
        Optional<User> user;
        try {
            user = authService.login(request.getEmail(), request.getPassword());
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason()));
        }
        if (user.isPresent() && AccountCodeService.unverified(user.get()) && codes.required()) {
            codes.send(user.get(), AccountCodeService.VERIFY);
            return ResponseEntity.status(403).body(Map.of("error", "Confirme seu e-mail: enviamos um código para " + user.get().getEmail(),
                    "verificationRequired", true, "email", user.get().getEmail()));
        }
        if (user.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(user.get()),
                    "token", jwtService.generateToken(user.get(), request.isOnly30Days())
            ));
        }
        return ResponseEntity.status(401).body(Map.of("error", "Credenciais inválidas"));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> body) {
        try {
            User user = codes.verify(body.get("email"), body.get("code"));
            return ResponseEntity.ok(Map.of("user", toDTO(user), "token", jwtService.generateToken(user)));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason()));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PostMapping("/forgot")
    public ResponseEntity<?> forgot(@RequestBody Map<String, String> body) {
        try {
            codes.forgot(body.get("email"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason()));
        }
        return ResponseEntity.ok(Map.of("message", "Se o e-mail tem conta, enviamos um código."));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset(@RequestBody Map<String, String> body) {
        String pw = body.get("newPassword");
        // same strength rule as signup
        if (pw == null || !pw.matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\\S+$).{8,100}$")) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Senha deve ter 8+ caracteres, com dígito, minúscula, maiúscula, caractere especial (@#$%^&+=) e sem espaços"));
        }
        try {
            codes.reset(body.get("email"), body.get("code"), pw);
            return ResponseEntity.ok(Map.of("message", "Senha alterada"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason()));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PostMapping("/pin/set")
    public ResponseEntity<?> setPin(@Valid @RequestBody PinRequest request) {
        try {
            User principal = (User) org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            pinService.setPin(principal.getId(), request.getCurrentPassword(), request.getPin());
            User updated = authService.findByEmail(principal.getEmail()).orElseThrow();
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(updated),
                    "message", "PIN configured successfully"
            ));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    @PostMapping("/pin/login")
    public ResponseEntity<?> pinLogin(@Valid @RequestBody PinLoginRequest request) {
        Optional<User> user = pinService.loginWithPin(request.getEmail(), request.getPin());
        if (user.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(user.get()),
                    "token", jwtService.generateToken(user.get(), request.isOnly30Days())
            ));
        }
        return ResponseEntity.status(401).body(Map.of("error", "PIN inválido"));
    }

    @DeleteMapping("/pin")
    public ResponseEntity<?> disablePin(@Valid @RequestBody PinRequest request) {
        try {
            User principal = (User) org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            pinService.disablePin(principal.getId(), request.getCurrentPassword());
            User updated = authService.findByEmail(principal.getEmail()).orElseThrow();
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(updated),
                    "message", "PIN disabled"
            ));
        } catch (Exception e) {
            return ApiErrorHandler.badRequest(e);
        }
    }

    private UserDTO toDTO(User user) {
        return UserDTO.from(user);
    }
}
