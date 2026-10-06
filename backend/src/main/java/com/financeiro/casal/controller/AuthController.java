package com.financeiro.casal.controller;

import com.financeiro.casal.dto.PinLoginRequest;
import com.financeiro.casal.dto.PinRequest;
import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.dto.UserLoginDTO;
import com.financeiro.casal.dto.UserRegistrationDTO;
import com.financeiro.casal.model.User;
import com.financeiro.casal.security.JwtService;
import com.financeiro.casal.service.AuthService;
import com.financeiro.casal.service.PinService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@AllArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final PinService pinService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRegistrationDTO request) {
        try {
            User user = authService.registerUser(
                    request.getEmail(),
                    request.getPassword(),
                    request.getName()
            );
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(user),
                    "token", jwtService.generateToken(user)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody UserLoginDTO request) {
        Optional<User> user = authService.login(request.getEmail(), request.getPassword());
        if (user.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(user.get()),
                    "token", jwtService.generateToken(user.get())
            ));
        }
        return ResponseEntity.status(401).body(Map.of("error", "Credenciais inválidas"));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestParam String email) {
        return authService.findByEmail(email)
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(toDTO(u)))
                .orElseGet(() -> ResponseEntity.notFound().build());
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/pin/login")
    public ResponseEntity<?> pinLogin(@Valid @RequestBody PinLoginRequest request) {
        Optional<User> user = pinService.loginWithPin(request.getPin());
        if (user.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "user", toDTO(user.get()),
                    "token", jwtService.generateToken(user.get())
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private UserDTO toDTO(User user) {
        return UserDTO.from(user);
    }
}
