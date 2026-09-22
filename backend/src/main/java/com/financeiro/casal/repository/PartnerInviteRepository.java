package com.financeiro.casal.repository;

import com.financeiro.casal.model.PartnerInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PartnerInviteRepository extends JpaRepository<PartnerInvite, Long> {

    Optional<PartnerInvite> findByCode(String code);

    Optional<PartnerInvite> findByInviterId(Long inviterId);

    void deleteByInviterId(Long inviterId);
}
