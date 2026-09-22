package com.financeiro.casal.repository;

import com.financeiro.casal.model.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findFirstByUserIdAndCodeAndUsedFalseOrderByCreatedAtDesc(Long userId, String code);

    void deleteByUserId(Long userId);
}
