package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailChangeConfirmDTO {

    @NotBlank(message = "Código de verificação é obrigatório")
    @Size(min = 6, max = 6, message = "O código tem 6 dígitos")
    private String code;
}
