package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PinLoginRequest {
    @NotBlank(message = "E-mail é obrigatório")
    private String email;

    @NotBlank(message = "PIN is required")
    private String pin;
}
