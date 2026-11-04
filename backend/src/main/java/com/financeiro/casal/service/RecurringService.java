package com.financeiro.casal.service;

import com.financeiro.casal.model.Account;
import com.financeiro.casal.model.RecurringTransaction;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.AccountRepository;
import com.financeiro.casal.repository.RecurringTransactionRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;

/**
 * Monthly bills and incomes. No scheduler: the app lists what is still pending this month and the
 * user (or the assistant, after confirmation) posts it with one tap.
 */
@Service
@AllArgsConstructor
public class RecurringService {

    private final RecurringTransactionRepository recurringRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;

    public static String currentMonth() {
        return YearMonth.now(AssistantTools.ZONE).toString();
    }

    public static boolean pendingThisMonth(RecurringTransaction r) {
        return !currentMonth().equals(r.getLastPostedMonth());
    }

    public List<RecurringTransaction> list(Long userId) {
        return recurringRepository.findByUserIdOrderByDayOfMonthAsc(userId);
    }

    @Transactional
    public RecurringTransaction create(RecurringTransaction r, Long accountId, User actor) {
        r.setUser(actor);
        r.setAccount(ownedAccount(accountId, actor));
        return recurringRepository.save(r);
    }

    @Transactional
    public RecurringTransaction update(Long id, RecurringTransaction changes, Long accountId, User actor) {
        RecurringTransaction r = get(id, actor);
        r.setTitle(changes.getTitle());
        r.setAmount(changes.getAmount());
        r.setType(changes.getType());
        r.setCategory(changes.getCategory());
        r.setDayOfMonth(changes.getDayOfMonth());
        r.setAccount(ownedAccount(accountId, actor));
        return recurringRepository.save(r);
    }

    @Transactional
    public void delete(Long id, User actor) {
        recurringRepository.delete(get(id, actor));
    }

    /** Books this month's occurrence on its day (clamped to the month's length). */
    @Transactional
    public Transaction post(Long id, User actor) {
        RecurringTransaction r = get(id, actor);
        if (!pendingThisMonth(r)) throw new RuntimeException("Já foi lançado este mês");
        YearMonth month = YearMonth.now(AssistantTools.ZONE);
        boolean income = r.getType() == Transaction.TransactionType.INCOME;
        Transaction tx = Transaction.builder()
                .title(r.getTitle())
                .amount(income ? r.getAmount() : -r.getAmount())
                .transactionDate(month.atDay(Math.min(r.getDayOfMonth(), month.lengthOfMonth())).atTime(12, 0))
                .type(r.getType())
                .category(r.getCategory())
                .build();
        Transaction saved = transactionService.createTransaction(tx, actor.getId(), r.getAccount().getId());
        r.setLastPostedMonth(month.toString());
        recurringRepository.save(r);
        return saved;
    }

    private RecurringTransaction get(Long id, User actor) {
        RecurringTransaction r = recurringRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recorrência não encontrada"));
        if (!r.getUser().getId().equals(actor.getId())) throw new RuntimeException("Recorrência não encontrada");
        return r;
    }

    private Account ownedAccount(Long accountId, User actor) {
        Account account = accountRepository.findById(accountId == null ? -1L : accountId)
                .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        if (!account.isOwnedBy(actor.getId())) throw new RuntimeException("Conta não encontrada");
        return account;
    }
}
