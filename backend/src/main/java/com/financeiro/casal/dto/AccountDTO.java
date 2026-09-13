package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountDTO {

    private Long id;

    @NotBlank(message = "Nome da conta é obrigatório")
    @Size(max = 100, message = "Nome da conta deve ter no máximo 100 caracteres")
    private String name;

    @NotNull(message = "É necessário especificar se a conta é conjunta ou pessoal")
    private Boolean isJoint;

    private Double currentBalance;

    @Size(max = 1000, message = "Lista de proprietários muito grande")
    private List<UserSummaryDTO> owners;
}