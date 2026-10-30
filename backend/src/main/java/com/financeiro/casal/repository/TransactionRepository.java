package com.financeiro.casal.repository;

import com.financeiro.casal.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByTransactionDateDesc(Long userId);
    List<Transaction> findByAccountIdOrderByTransactionDateDesc(Long accountId);
    /** Account balance = sum of its (signed) transactions; the ledger is the only source of truth. */
    @Query("select coalesce(sum(t.amount), 0) from Transaction t where t.account.id = :accountId")
    double sumByAccountId(Long accountId);
}