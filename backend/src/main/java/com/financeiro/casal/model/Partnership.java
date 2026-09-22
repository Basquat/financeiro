package com.financeiro.casal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** Links exactly two users so they can share joint accounts and goals. */
@Entity
@Table(name = "partnerships")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Partnership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_a_id")
    private User userA;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_b_id")
    private User userB;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public boolean includes(Long userId) {
        return (userA != null && userA.getId().equals(userId))
                || (userB != null && userB.getId().equals(userId));
    }

    public User other(Long userId) {
        return userA != null && userA.getId().equals(userId) ? userB : userA;
    }
}
