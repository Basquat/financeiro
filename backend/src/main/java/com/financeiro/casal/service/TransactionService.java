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

    public static final String TRANSFER_CATEGORY = "Transferência";

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
        transaction.setUser(user);
        transaction.setAccount(ownedAccount(accountId, userId));
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction updateTransaction(Long id, Transaction changes, Long accountId, User actor) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));
        assertCanTouch(tx, actor);

        tx.setTitle(changes.getTitle());
        tx.setAmount(changes.getAmount());
        tx.setTransactionDate(changes.getTransactionDate());
        tx.setType(changes.getType());
        tx.setCategory(changes.getCategory());
        tx.setInstallmentCurrent(changes.getInstallmentCurrent());
        tx.setInstallmentTotal(changes.getInstallmentTotal());

        if (accountId != null && !accountId.equals(tx.getAccount().getId())) {
            tx.setAccount(ownedAccount(accountId, actor.getId()));
        }
        return transactionRepository.save(tx);
    }

    @Transactional
    public void deleteTransaction(Long id, User actor) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));
        assertCanTouch(tx, actor);
        transactionRepository.delete(tx);
    }

    /**
     * Moves money between two of the user's accounts: an expense on one, an income on the other, both in
     * {@link #TRANSFER_CATEGORY} so reports can leave them out. Paying a credit card bill is a transfer to it.
     */
    @Transactional
    public List<Transaction> transfer(Long fromAccountId, Long toAccountId, Double amount, LocalDateTime date, User actor) {
        if (fromAccountId == null || fromAccountId.equals(toAccountId)) throw new RuntimeException("Escolha duas contas diferentes");
        if (amount == null || !(amount > 0)) throw new RuntimeException("Informe um valor maior que zero");
        User user = userRepository.findById(actor.getId())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        Account from = ownedAccount(fromAccountId, user.getId());
        Account to = ownedAccount(toAccountId, user.getId());
        LocalDateTime when = date == null ? LocalDateTime.now() : date;
        Transaction out = Transaction.builder().title("Transferência para " + to.getName()).amount(-amount)
                .transactionDate(when).type(Transaction.TransactionType.EXPENSE).category(TRANSFER_CATEGORY)
                .user(user).account(from).build();
        Transaction in = Transaction.builder().title("Transferência de " + from.getName()).amount(amount)
                .transactionDate(when).type(Transaction.TransactionType.INCOME).category(TRANSFER_CATEGORY)
                .user(user).account(to).build();
        return transactionRepository.saveAll(List.of(out, in));
    }

    public List<Transaction> getUserTransactions(Long userId) {
        return transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
    }

    public List<Transaction> getAccountTransactions(Long accountId) {
        return transactionRepository.findByAccountIdOrderByTransactionDateDesc(accountId);
    }

    /** Net balance across the user's transactions. Amounts are already signed (expenses negative). */
    public Double getUserBalance(Long userId) {
        return getUserTransactions(userId).stream()
                .mapToDouble(Transaction::getAmount)
                .sum();
    }

    private Account ownedAccount(Long accountId, Long userId) {
        Account account = accountRepository.findById(accountId == null ? -1L : accountId)
                .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!account.isOwnedBy(userId)) {
            throw new RuntimeException("Conta não encontrada");
        }
        return account;
    }

    private void assertCanTouch(Transaction tx, User actor) {
        boolean owner = tx.getUser() != null && tx.getUser().getId().equals(actor.getId());
        boolean coOwner = tx.getAccount() != null && tx.getAccount().isOwnedBy(actor.getId());
        if (!owner && !coOwner) {
            throw new RuntimeException("Você não pode alterar este lançamento");
        }
    }
}
