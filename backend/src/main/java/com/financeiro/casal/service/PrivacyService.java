package com.financeiro.casal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.financeiro.casal.dto.UserDTO;
import com.financeiro.casal.model.*;
import com.financeiro.casal.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** LGPD: the owner can take all their data out (portability) and delete the account. */
@Service
@AllArgsConstructor
public class PrivacyService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final InstallmentPlanRepository installmentPlanRepository;
    private final SharedGoalRepository sharedGoalRepository;
    private final RecurringTransactionRepository recurringRepository;
    private final PartnerInviteRepository inviteRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final PartnerService partnerService;
    private final AccountService accountService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper json;

    /** Everything stored about the user, minus secrets (password/PIN hashes, assistant API key). */
    public ObjectNode export(User actor) {
        User u = userRepository.findById(actor.getId()).orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        ObjectNode out = json.createObjectNode();
        out.put("exportadoEm", Instant.now().toString());
        out.set("perfil", json.valueToTree(UserDTO.from(u)));
        out.put("assistenteProvedor", u.getAiProvider());
        out.put("assistenteModelo", u.getAiModel());
        out.put("assistenteAnotacoes", u.getAiNotes());

        ArrayNode accounts = out.putArray("contas");
        for (Account a : accountRepository.findByOwnersId(u.getId())) {
            accounts.addObject().put("id", a.getId()).put("nome", a.getName()).put("conjunta", a.getIsJoint())
                    .put("cartaoDeCredito", Boolean.TRUE.equals(a.getCreditCard())).put("saldo", accountService.balanceOf(a.getId()));
        }
        ArrayNode txs = out.putArray("lancamentos");
        for (Transaction t : transactionRepository.findByUserIdOrderByTransactionDateDesc(u.getId())) {
            txs.addObject().put("id", t.getId()).put("data", t.getTransactionDate().toString()).put("titulo", t.getTitle())
                    .put("valor", t.getAmount()).put("tipo", t.getType().name()).put("categoria", t.getCategory())
                    .put("conta", t.getAccount().getName())
                    .put("parcelaAtual", t.getInstallmentCurrent()).put("parcelasTotal", t.getInstallmentTotal());
        }
        ArrayNode plans = out.putArray("parcelamentos");
        for (InstallmentPlan p : installmentPlanRepository.findByUserId(u.getId())) {
            plans.addObject().put("titulo", p.getTitle()).put("total", p.getTotalAmount()).put("restante", p.getRemainingAmount())
                    .put("parcelasRestantes", p.getInstallmentsLeft()).put("vencimento", String.valueOf(p.getDueDate()))
                    .put("categoria", p.getCategory());
        }
        ArrayNode goals = out.putArray("metas");
        for (SharedGoal g : sharedGoalRepository.findByOwnerId(u.getId())) {
            goals.addObject().put("titulo", g.getTitle()).put("objetivo", g.getTargetAmount())
                    .put("guardado", g.getCurrentAmount()).put("prazo", String.valueOf(g.getDeadline()));
        }
        ArrayNode recurring = out.putArray("recorrentes");
        for (RecurringTransaction r : recurringRepository.findByUserIdOrderByDayOfMonthAsc(u.getId())) {
            recurring.addObject().put("titulo", r.getTitle()).put("valor", r.getAmount()).put("tipo", r.getType().name())
                    .put("categoria", r.getCategory()).put("dia", r.getDayOfMonth()).put("conta", r.getAccount().getName());
        }
        return out;
    }

    /**
     * Deletes the account after the password is confirmed. The other person in a joint account keeps
     * the account and their own records; only this user's data goes.
     */
    @Transactional
    public void deleteAccount(User actor, String password) {
        User u = userRepository.findById(actor.getId()).orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (password == null || !passwordEncoder.matches(password, u.getPassword())) {
            throw new RuntimeException("Senha incorreta");
        }
        Long id = u.getId();
        if (partnerService.partnershipOf(id).isPresent()) partnerService.dissolve(id);
        inviteRepository.deleteByInviterId(id);
        tokenRepository.deleteByUserId(id);
        recurringRepository.deleteAll(recurringRepository.findByUserIdOrderByDayOfMonthAsc(id));
        installmentPlanRepository.deleteAll(installmentPlanRepository.findByUserId(id));
        sharedGoalRepository.deleteAll(sharedGoalRepository.findByOwnerId(id));
        transactionRepository.deleteAll(transactionRepository.findByUserIdOrderByTransactionDateDesc(id));

        for (Account a : accountRepository.findByOwnersId(id)) {
            a.getOwners().removeIf(owner -> owner.getId().equals(id));
            if (a.getOwners().isEmpty()) {
                // nobody left: whatever still points at the account goes with it
                transactionRepository.deleteAll(transactionRepository.findByAccountIdOrderByTransactionDateDesc(a.getId()));
                recurringRepository.deleteByAccountId(a.getId());
                accountRepository.delete(a);
            } else {
                if (a.getCreator() != null && a.getCreator().getId().equals(id)) a.setCreator(a.getOwners().get(0));
                accountRepository.save(a);
            }
        }
        userRepository.delete(u);
    }
}
