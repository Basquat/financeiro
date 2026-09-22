package com.financeiro.casal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "shared_goals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SharedGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "target_amount", nullable = false)
    private Double targetAmount;

    @Column(name = "current_amount", nullable = false)
    private Double currentAmount;

    @Column(nullable = false)
    private LocalDate deadline;

    private String icon;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User owner;

    /** When set, the goal is visible to both partners; null = private to the owner. */
    @ManyToOne
    @JoinColumn(name = "partnership_id")
    private Partnership partnership;
}
