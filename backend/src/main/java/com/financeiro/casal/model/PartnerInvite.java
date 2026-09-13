package com.financeiro.casal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** A one-time code the inviter shares so someone can pair with them. */
@Entity
@Table(name = "partner_invites")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "inviter_id")
    private User inviter;

    @Column(nullable = false, unique = true, length = 12)
    private String code;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
