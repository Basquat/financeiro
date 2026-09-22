package com.financeiro.casal.service;

import com.financeiro.casal.model.EmailVerificationToken;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.EmailVerificationTokenRepository;
import com.financeiro.casal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailChangeService {

    private static final Logger log = LoggerFactory.getLogger(EmailChangeService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@financeiro-casal.local}")
    private String mailFrom;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${app.email-verification.expiration-minutes:15}")
    private long expirationMinutes;

    /**
     * Starts an e-mail change: generates a 6-digit code, stores it and sends it
     * to the NEW address so the user proves they own it.
     */
    @Transactional
    public void requestChange(User user, String newEmail) {
        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            throw new RuntimeException("O novo e-mail é igual ao atual");
        }
        if (userRepository.findByEmail(newEmail).isPresent()) {
            throw new RuntimeException("Este e-mail já está em uso");
        }

        tokenRepository.deleteByUserId(user.getId());

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerificationToken token = EmailVerificationToken.builder()
                .user(user)
                .newEmail(newEmail)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        tokenRepository.save(token);

        sendCode(newEmail, user.getName(), code);
    }

    /**
     * Confirms the change: validates the code and, if valid, swaps the user's e-mail.
     */
    @Transactional
    public User confirmChange(User user, String code) {
        EmailVerificationToken token = tokenRepository
                .findFirstByUserIdAndCodeAndUsedFalseOrderByCreatedAtDesc(user.getId(), code)
                .orElseThrow(() -> new RuntimeException("Código inválido"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Código expirado. Solicite um novo.");
        }
        if (userRepository.findByEmail(token.getNewEmail()).isPresent()) {
            throw new RuntimeException("Este e-mail já está em uso");
        }

        User managed = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        managed.setEmail(token.getNewEmail());
        userRepository.save(managed);

        token.setUsed(true);
        tokenRepository.save(token);

        return managed;
    }

    private void sendCode(String toEmail, String name, String code) {
        String body = """
                Olá %s,

                Recebemos um pedido para alterar o e-mail da sua conta no Finanças do Casal.
                Use o código abaixo para confirmar (expira em %d minutos):

                    %s

                Se você não fez esse pedido, ignore este e-mail.
                """.formatted(name, expirationMinutes, code);

        if (smtpUser == null || smtpUser.isBlank()) {
            // No SMTP configured (e.g. local dev): log the code so it can still be used.
            log.warn("SMTP não configurado. Código de verificação para {}: {}", toEmail, code);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            message.setSubject("Código de verificação - Finanças do Casal");
            message.setText(body);
            mailSender.send(message);
            log.info("E-mail de verificação enviado para {}", toEmail);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail de verificação para {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Não foi possível enviar o e-mail de verificação. Tente novamente.");
        }
    }
}
