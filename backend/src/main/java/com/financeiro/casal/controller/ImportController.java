package com.financeiro.casal.controller;

import com.financeiro.casal.model.User;
import com.financeiro.casal.service.ImportService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@AllArgsConstructor
public class ImportController {

    private final ImportService importService;

    record PreviewRequest(Long accountId, String data) {}

    record CommitRequest(Long accountId, List<ImportService.CommitRow> rows) {}

    /** Parses an OFX file (base64) and flags rows that already exist in the account. Writes nothing. */
    @PostMapping("/ofx")
    public ResponseEntity<?> preview(@AuthenticationPrincipal User user, @RequestBody PreviewRequest req) {
        try {
            return ResponseEntity.ok(Map.of("rows", importService.previewOfx(req.data(), req.accountId(), user)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    @PostMapping("/commit")
    public ResponseEntity<?> commit(@AuthenticationPrincipal User user, @RequestBody CommitRequest req) {
        try {
            return ResponseEntity.ok(Map.of("imported", importService.commit(req.accountId(), req.rows(), user)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }
}
