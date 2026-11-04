package com.financeiro.casal.repository;

import com.financeiro.casal.model.RecurringTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecurringTransactionRepository extends JpaRepository<RecurringTransaction, Long> {

    List<RecurringTransaction> findByUserIdOrderByDayOfMonthAsc(Long userId);

    void deleteByAccountId(Long accountId);
}
