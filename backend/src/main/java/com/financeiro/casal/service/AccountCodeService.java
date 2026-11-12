package com.financeiro.casal.service;

import com.financeiro.casal.model.EmailVerificationToken;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.EmailVerificationTokenRepository;
import com.financeiro.casal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/** 6-digit e-mail codes for signup confirmation (VERIFY) and password reset (RESET). */
@Service
@RequiredArgsConstructor
public class AccountCodeService {

    public static final String VERIFY = "VERIFY", RESET = "RESET";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokens;
    private final UserRepository users;
    private final EmailChangeService mail;
    private final AuthService auth;
    private final PasswordEncoder encoder;

    @Value("${app.email-verification.expiration-minutes:15}")
    private long minutes;

    @Value("${app.email-verification.required:true}")
    private boolean required;

    /** Prod without SMTP would only log the codes and lock every new user out: refuse to boot instead. */
    @org.springframework.beans.factory.annotation.Autowired
    void requireSmtpInProd(org.springframework.core.env.Environment env,
                           @Value("${spring.mail.username:}") String smtpUser) {
        if (required && smtpUser.isBlank() && env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))) {
            throw new IllegalStateException("SMTP_USER/SMTP_PASS/SMTP_HOST são obrigatórios em produção "
                    + "(ou REQUIRE_EMAIL_VERIFICATION=false para subir sem confirmação de e-mail).");
        }
    }

    public boolean required() {
        return required;
    }

    public static boolean unverified(User u) {
        return Boolean.FALSE.equals(u.getEmailVerified());
    }

    @Transactional
    public void send(User user, String purpose) {
        String sendKey = "code-send:" + user.getId();
        auth.checkThrottle(sendKey);
        auth.recordFailure(sendKey); // counts sends too: 5 per 15 min per account, so nobody can mail-bomb an inbox
        tokens.deleteByUserIdAndPurpose(user.getId(), purpose);
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        tokens.save(EmailVerificationToken.builder().user(user).newEmail(user.getEmail()).code(code).purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(minutes)).used(false).createdAt(LocalDateTime.now()).build());
        mail.sendCode(user.getEmail(), user.getName(), code,
                VERIFY.equals(purpose) ? "confirmar o e-mail da sua conta" : "redefinir a senha da sua conta");
    }

    /** Burns the code on success; 5 wrong guesses wipe it (6 digits can't be brute-forced). */
    private void consume(User user, String purpose, String code) {
        String key = "code-try:" + purpose + user.getId();
        auth.checkThrottle(key);
        Optional<EmailVerificationToken> t = tokens
                .findFirstByUserIdAndPurposeAndCodeAndUsedFalseOrderByCreatedAtDesc(user.getId(), purpose, code == null ? "" : code.trim());
        if (t.isEmpty() || t.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            if (auth.recordFailure(key)) tokens.deleteByUserIdAndPurpose(user.getId(), purpose);
            throw new RuntimeException("Código inválido ou expirado");
        }
        auth.clearFailures(key);
        tokens.deleteByUserIdAndPurpose(user.getId(), purpose);
    }

    @Transactional
    public User verify(String email, String code) {
        User u = find(email);
        consume(u, VERIFY, code);
        u.setEmailVerified(true);
        return users.save(u);
    }

    /** Always silent: the answer never reveals whether the e-mail has an account. */
    public void forgot(String email) {
        users.findByEmail(email == null ? "" : email.trim()).ifPresent(u -> send(u, RESET));
    }

    @Transactional
    public void reset(String email, String code, String newPassword) {
        User u = find(email);
        consume(u, RESET, code);
        u.setPassword(encoder.encode(newPassword));
        u.setEmailVerified(true); // the code proves mailbox ownership
        users.save(u);
    }

    private User find(String email) {
        return users.findByEmail(email == null ? "" : email.trim()).orElseThrow(() -> new RuntimeException("Código inválido ou expirado"));
    }
}
