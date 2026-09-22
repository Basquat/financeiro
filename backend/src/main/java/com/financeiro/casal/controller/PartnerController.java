package com.financeiro.casal.controller;

import com.financeiro.casal.dto.PartnerStatusDTO;
import com.financeiro.casal.dto.UserSummaryDTO;
import com.financeiro.casal.model.PartnerInvite;
import com.financeiro.casal.model.User;
import com.financeiro.casal.service.PartnerService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/partner")
@AllArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;

    @GetMapping
    public ResponseEntity<?> status(@AuthenticationPrincipal User user) {
        PartnerStatusDTO.PartnerStatusDTOBuilder dto = PartnerStatusDTO.builder();
        partnerService.partnerOf(user.getId()).ifPresent(p -> dto.partner(summary(p)));
        partnerService.pendingInvite(user.getId()).ifPresent(inv -> dto.invite(
                PartnerStatusDTO.Invite.builder().code(inv.getCode()).expiresAt(inv.getExpiresAt()).build()));
        return ResponseEntity.ok(dto.build());
    }

    @PostMapping("/invite")
    public ResponseEntity<?> createInvite(@AuthenticationPrincipal User user) {
        try {
            PartnerInvite inv = partnerService.createInvite(user);
            return ResponseEntity.ok(Map.of("code", inv.getCode(), "expiresAt", inv.getExpiresAt()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/invite")
    public ResponseEntity<?> revokeInvite(@AuthenticationPrincipal User user) {
        partnerService.revokeInvite(user.getId());
        return ResponseEntity.ok(Map.of("message", "Convite cancelado"));
    }

    @PostMapping("/accept")
    public ResponseEntity<?> accept(@AuthenticationPrincipal User user, @RequestBody Map<String, String> body) {
        try {
            User inviter = partnerService.acceptInvite(user, body.get("code"));
            return ResponseEntity.ok(Map.of(
                    "partner", summary(inviter),
                    "message", "Vocês agora compartilham contas conjuntas e metas."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> dissolve(@AuthenticationPrincipal User user) {
        try {
            partnerService.dissolve(user.getId());
            return ResponseEntity.ok(Map.of("message", "Parceria desfeita"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private UserSummaryDTO summary(User u) {
        return UserSummaryDTO.builder().id(u.getId()).name(u.getName()).avatarUrl(u.getAvatarUrl()).build();
    }
}
