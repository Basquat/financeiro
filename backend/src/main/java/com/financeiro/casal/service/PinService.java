package com.financeiro.casal.service;

import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@AllArgsConstructor
public class PinService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    private static final int MIN_PIN_LENGTH = 4;
    private static final int MAX_PIN_LENGTH = 6;

    public void setPin(Long userId, String currentPassword, String pin) {
        validatePin(pin);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Optional<User> login = authService.login(user.getEmail(), currentPassword);
        if (login.isEmpty()) {
            throw new RuntimeException("Invalid password");
        }
        user.setPinHash(passwordEncoder.encode(pin));
        user.setPinEnabled(true);
        userRepository.save(user);
    }

    public Optional<User> loginWithPin(String pin) {
        if (pin == null || pin.length() < MIN_PIN_LENGTH || pin.length() > MAX_PIN_LENGTH) {
            return Optional.empty();
        }
        return userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getPinEnabled()) && u.getPinHash() != null)
                .filter(u -> passwordEncoder.matches(pin, u.getPinHash()))
                .findFirst();
    }

    public void disablePin(Long userId, String currentPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Optional<User> login = authService.login(user.getEmail(), currentPassword);
        if (login.isEmpty()) {
            throw new RuntimeException("Invalid password");
        }
        user.setPinHash(null);
        user.setPinEnabled(false);
        userRepository.save(user);
    }

    private void validatePin(String pin) {
        if (pin == null || pin.length() < MIN_PIN_LENGTH || pin.length() > MAX_PIN_LENGTH) {
            throw new RuntimeException("PIN must be between " + MIN_PIN_LENGTH + " and " + MAX_PIN_LENGTH + " digits");
        }
        if (!pin.matches("\\d+")) {
            throw new RuntimeException("PIN must contain only numbers");
        }
        if (isSimpleSequence(pin)) {
            throw new RuntimeException("PIN cannot be a simple sequence like 1234 or 0000");
        }
    }

    private boolean isSimpleSequence(String pin) {
        boolean ascending = true;
        boolean descending = true;
        boolean repeated = true;
        for (int i = 1; i < pin.length(); i++) {
            char prev = pin.charAt(i - 1);
            char curr = pin.charAt(i);
            if (curr != prev + 1) ascending = false;
            if (curr != prev - 1) descending = false;
            if (curr != prev) repeated = false;
        }
        return ascending || descending || repeated;
    }
}
