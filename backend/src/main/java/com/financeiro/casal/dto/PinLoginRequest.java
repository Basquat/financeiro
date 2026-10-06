package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PinLoginRequest {
    @NotBlank(message = "PIN is required")
    private String pin;
}
