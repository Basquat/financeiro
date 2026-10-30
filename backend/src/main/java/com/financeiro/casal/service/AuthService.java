package com.financeiro.casal.service;

import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Optional;

@Service
@AllArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final AuthenticationManager authenticationManager;

    private static final int MAX_FAILURES = 5;
    private static final long WINDOW_SECONDS = 15 * 60;
    // ponytail: in-memory per instance (one container today); move to a DB/Redis table if it ever scales out
    private final Map<String, long[]> failures = new ConcurrentHashMap<>();

    public User registerUser(String email, String password, String name) {
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .name(name)
                .roles(Collections.singletonList("USER"))
                .build();

        return userRepository.save(user);
    }

    /** Rejects the attempt with 429 while {@code key} has too many recent failures. */
    public void checkThrottle(String key) {
        long[] f = failures.get(key);
        if (f != null && f[0] >= MAX_FAILURES && Instant.now().getEpochSecond() - f[1] < WINDOW_SECONDS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas. Aguarde 15 minutos e tente de novo.");
        }
    }

    /** Records a failure; returns true once the key reached the limit. */
    public boolean recordFailure(String key) {
        long now = Instant.now().getEpochSecond();
        if (failures.size() > 10_000) failures.clear(); // bound memory under credential-stuffing
        long[] f = failures.compute(key, (k, old) -> old == null || now - old[1] >= WINDOW_SECONDS
                ? new long[]{1, now} : new long[]{old[0] + 1, old[1]});
        return f[0] >= MAX_FAILURES;
    }

    public void clearFailures(String key) {
        failures.remove(key);
    }

    public Optional<User> login(String email, String password) {
        String key = "login:" + (email == null ? "" : email.trim().toLowerCase());
        checkThrottle(key);
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            clearFailures(key);
            return userRepository.findByEmail(email);
        } catch (Exception e) {
            recordFailure(key);
            return Optional.empty();
        }
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}