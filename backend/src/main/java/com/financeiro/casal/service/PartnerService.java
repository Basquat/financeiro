package com.financeiro.casal.service;

import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.PartnerInvite;
import com.financeiro.casal.model.Partnership;
import com.financeiro.casal.model.SharedGoal;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.AccountRepository;
import com.financeiro.casal.repository.PartnerInviteRepository;
import com.financeiro.casal.repository.PartnershipRepository;
import com.financeiro.casal.repository.SharedGoalRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@AllArgsConstructor
public class PartnerService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PartnershipRepository partnershipRepository;
    private final PartnerInviteRepository inviteRepository;
    private final AccountRepository accountRepository;
    private final SharedGoalRepository sharedGoalRepository;

    public Optional<Partnership> partnershipOf(Long userId) {
        return partnershipRepository.findForUser(userId);
    }

    public Optional<User> partnerOf(Long userId) {
        return partnershipOf(userId).map(p -> p.other(userId));
    }

    public Optional<PartnerInvite> pendingInvite(Long userId) {
        return inviteRepository.findByInviterId(userId);
    }

    @Transactional
    public PartnerInvite createInvite(User inviter) {
        if (partnershipOf(inviter.getId()).isPresent()) {
            throw new RuntimeException("Você já tem uma parceria ativa. Desfaça antes de convidar outra pessoa.");
        }
        inviteRepository.deleteByInviterId(inviter.getId());
        inviteRepository.flush();

        String code;
        do {
            code = randomCode();
        } while (inviteRepository.findByCode(code).isPresent());

        Instant now = Instant.now();
        return inviteRepository.save(PartnerInvite.builder()
                .inviter(inviter)
                .code(code)
                .createdAt(now)
                .expiresAt(now.plus(7, ChronoUnit.DAYS))
                .build());
    }

    @Transactional
    public void revokeInvite(Long userId) {
        inviteRepository.deleteByInviterId(userId);
    }

    @Transactional
    public User acceptInvite(User accepter, String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase().replace("-", "");
        PartnerInvite invite = inviteRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Código inválido"));
        if (invite.getExpiresAt().isBefore(Instant.now())) {
            inviteRepository.delete(invite);
            throw new RuntimeException("Este convite expirou. Peça um novo.");
        }
        User inviter = invite.getInviter();
        if (inviter.getId().equals(accepter.getId())) {
            throw new RuntimeException("Você não pode aceitar o seu próprio convite.");
        }
        if (partnershipOf(accepter.getId()).isPresent() || partnershipOf(inviter.getId()).isPresent()) {
            throw new RuntimeException("Uma das contas já está em outra parceria.");
        }

        Partnership partnership = partnershipRepository.save(Partnership.builder()
                .userA(inviter)
                .userB(accepter)
                .createdAt(Instant.now())
                .build());

        // Share existing joint accounts both ways, and existing joint goals.
        shareJointAccounts(inviter, accepter);
        shareJointAccounts(accepter, inviter);
        for (SharedGoal g : sharedGoalRepository.findVisibleTo(inviter.getId())) {
            if (g.getPartnership() == null) {
                g.setPartnership(partnership);
                sharedGoalRepository.save(g);
            }
        }
        for (SharedGoal g : sharedGoalRepository.findVisibleTo(accepter.getId())) {
            if (g.getPartnership() == null) {
                g.setPartnership(partnership);
                sharedGoalRepository.save(g);
            }
        }

        inviteRepository.delete(invite);
        return inviter;
    }

    @Transactional
    public void dissolve(Long userId) {
        Partnership p = partnershipRepository.findForUser(userId)
                .orElseThrow(() -> new RuntimeException("Você não tem parceria ativa."));
        Long aId = p.getUserA().getId();
        Long bId = p.getUserB().getId();

        // Each person keeps the joint accounts they created; loses access to the partner's.
        unshareJointAccounts(bId, aId); // remove B from A's joint accounts
        unshareJointAccounts(aId, bId); // remove A from B's joint accounts

        // Joint goals revert to the owner only.
        for (SharedGoal g : sharedGoalRepository.findByPartnershipId(p.getId())) {
            g.setPartnership(null);
            sharedGoalRepository.save(g);
        }

        partnershipRepository.delete(p);
    }

    private void shareJointAccounts(User owner, User partner) {
        for (Account a : accountRepository.findByOwnersId(owner.getId())) {
            if (Boolean.TRUE.equals(a.getIsJoint())
                    && a.getOwners() != null
                    && a.getOwners().stream().noneMatch(u -> u.getId().equals(partner.getId()))) {
                a.getOwners().add(partner);
                accountRepository.save(a);
            }
        }
    }

    private void unshareJointAccounts(Long removeUserId, Long keepCreatorId) {
        for (Account a : accountRepository.findByOwnersId(keepCreatorId)) {
            boolean createdByKeeper = a.getCreator() != null && a.getCreator().getId().equals(keepCreatorId);
            if (createdByKeeper && a.getOwners() != null) {
                a.getOwners().removeIf(u -> u.getId().equals(removeUserId));
                accountRepository.save(a);
            }
        }
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
