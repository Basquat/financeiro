package com.financeiro.casal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A bill or income that repeats every month (rent, salary, subscriptions); posted with one tap. */
@Entity
@Table(name = "recurring_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecurringTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    /** Always positive; the type gives the sign when it is posted. */
    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Transaction.TransactionType type;

    @Column(nullable = false)
    private String category;

    @Column(name = "day_of_month", nullable = false)
    private Integer dayOfMonth;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** "2026-11" once this month's occurrence was posted. */
    @Column(name = "last_posted_month", length = 7)
    private String lastPostedMonth;
}
