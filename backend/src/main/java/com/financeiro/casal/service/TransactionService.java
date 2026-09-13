package com.financeiro.casal.service;

import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.AccountRepository;
import com.financeiro.casal.repository.TransactionRepository;
import com.financeiro.casal.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    /**
     * Persists a transaction, resolving and attaching its user and account.
     */
    @Transactional
    public Transaction createTransaction(Transaction transaction, Long userId, Long accountId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        transaction.setUser(user);
        transaction.setAccount(account);
        Transaction saved = transactionRepository.save(transaction);
        applyToBalance(account, transaction.getAmount());
        return saved;
    }

    @Transactional
    public Transaction updateTransaction(Long id, Transaction changes, Long accountId, User actor) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));
        assertCanTouch(tx, actor);

        Account oldAccount = tx.getAccount();
        applyToBalance(oldAccount, -tx.getAmount());

        tx.setTitle(changes.getTitle());
        tx.setAmount(changes.getAmount());
        tx.setTransactionDate(changes.getTransactionDate());
        tx.setType(changes.getType());
        tx.setCategory(changes.getCategory());
        tx.setInstallmentCurrent(changes.getInstallmentCurrent());
        tx.setInstallmentTotal(changes.getInstallmentTotal());

        Account newAccount = oldAccount;
        if (accountId != null && !accountId.equals(oldAccount.getId())) {
            newAccount = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
            tx.setAccount(newAccount);
        }
        applyToBalance(newAccount, tx.getAmount());

        return transactionRepository.save(tx);
    }

    @Transactional
    public void deleteTransaction(Long id, User actor) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));
        assertCanTouch(tx, actor);
        applyToBalance(tx.getAccount(), -tx.getAmount());
        transactionRepository.delete(tx);
    }

    public List<Transaction> getUserTransactions(Long userId) {
        return transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
    }

    public List<Transaction> getAccountTransactions(Long accountId) {
        return transactionRepository.findByAccountIdOrderByTransactionDateDesc(accountId);
    }

    public List<Transaction> getTransactionsByDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        return transactionRepository.findByTransactionDateBetweenOrderByTransactionDateDesc(startDate, endDate);
    }

    /** Net balance across the user's transactions. Amounts are already signed (expenses negative). */
    public Double getUserBalance(Long userId) {
        return getUserTransactions(userId).stream()
                .mapToDouble(Transaction::getAmount)
                .sum();
    }

    private void applyToBalance(Account account, double delta) {
        if (account == null) return;
        double base = account.getCurrentBalance() == null ? 0.0 : account.getCurrentBalance();
        account.setCurrentBalance(Math.round((base + delta) * 100.0) / 100.0);
        accountRepository.save(account);
    }

    private void assertCanTouch(Transaction tx, User actor) {
        boolean owner = tx.getUser() != null && tx.getUser().getId().equals(actor.getId());
        boolean coOwner = tx.getAccount() != null && tx.getAccount().getOwners() != null
                && tx.getAccount().getOwners().stream().anyMatch(u -> u.getId().equals(actor.getId()));
        if (!owner && !coOwner) {
            throw new RuntimeException("Você não pode alterar este lançamento");
        }
    }
}
