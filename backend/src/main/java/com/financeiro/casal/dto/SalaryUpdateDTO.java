package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryUpdateDTO {

    @NotNull(message = "Salário é obrigatório")
    @PositiveOrZero(message = "Salário não pode ser negativo")
    private Double salary;
}
