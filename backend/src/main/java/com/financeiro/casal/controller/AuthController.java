package com.financeiro.casal.controller;

import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.dto.UserLoginDTO;
import com.financeiro.casal.dto.UserRegistrationDTO;
import com.financeiro.casal.model.User;
import com.financeiro.casal.security.JwtService;
import com.financeiro.casal.service.AuthService;
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

    private UserDTO toDTO(User user) {
        return UserDTO.from(user);
    }
}
