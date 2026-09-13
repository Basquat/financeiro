package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountRequestDTO {

    @NotBlank(message = "Nome da conta é obrigatório")
    @Size(max = 100, message = "Nome da conta deve ter no máximo 100 caracteres")
    private String name;

    @NotNull(message = "É necessário especificar se a conta é conjunta ou pessoal")
    private Boolean isJoint;
}