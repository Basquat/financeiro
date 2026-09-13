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

    /** Who created the account — kept when a partnership is dissolved. */
    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;

    @Column(name = "current_balance")
    private Double currentBalance;
}