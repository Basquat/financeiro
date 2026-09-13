package com.financeiro.casal.service;

import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.AccountRepository;
import com.financeiro.casal.repository.TransactionRepository;
import com.financeiro.casal.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final PartnerService partnerService;

    @Transactional
    public Account createAccount(Account account, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (account.getOwners() == null) {
            account.setOwners(new ArrayList<>());
        }
        account.getOwners().add(user);
        account.setCreator(user);

        // A joint account is automatically shared with the current partner, if any.
        if (Boolean.TRUE.equals(account.getIsJoint())) {
            partnerService.partnerOf(userId).ifPresent(account.getOwners()::add);
        }
        return accountRepository.save(account);
    }

    public List<Account> getUserAccounts(Long userId) {
        return accountRepository.findByOwnersId(userId);
    }

    @Transactional
    public Account updateAccount(Long id, String name, Boolean isJoint, User actor) {
        Account account = get(id, actor);
        account.setName(name);
        if (isJoint != null) {
            account.setIsJoint(isJoint);
        }
        return accountRepository.save(account);
    }

    @Transactional
    public void deleteAccount(Long id, User actor) {
        Account account = get(id, actor);
        if (!transactionRepository.findByAccountIdOrderByTransactionDateDesc(id).isEmpty()) {
            throw new RuntimeException("Esta conta tem lançamentos. Exclua os lançamentos primeiro.");
        }
        accountRepository.delete(account);
    }

    private Account get(Long id, User actor) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        boolean owner = account.getOwners() != null
                && account.getOwners().stream().anyMatch(u -> u.getId().equals(actor.getId()));
        if (!owner) {
            throw new RuntimeException("Você não é dono desta conta");
        }
        return account;
    }
}
