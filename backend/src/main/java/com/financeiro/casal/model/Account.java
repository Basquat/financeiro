package com.financeiro.casal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Boolean isJoint;

    @ManyToMany
    @JoinTable(
        name = "account_owners",
        joinColumns = @JoinColumn(name = "account_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private List<User> owners;

    /** Cartão de crédito: o saldo negativo é a fatura em aberto; pagar = transferir de outra conta. */
    @Column(name = "credit_card")
    private Boolean creditCard;

    @Column(name = "closing_day")
    private Integer closingDay;

    @Column(name = "due_day")
    private Integer dueDay;

    /** Who created the account — kept when a partnership is dissolved. */
    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;

    public boolean isOwnedBy(Long userId) {
        return owners != null && owners.stream().anyMatch(u -> u.getId().equals(userId));
    }
}