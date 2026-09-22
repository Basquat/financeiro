package com.financeiro.casal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerStatusDTO {

    /** The connected partner, or null. */
    private UserSummaryDTO partner;

    /** The pending invite this user generated, or null. */
    private Invite invite;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Invite {
        private String code;
        private Instant expiresAt;
    }
}
