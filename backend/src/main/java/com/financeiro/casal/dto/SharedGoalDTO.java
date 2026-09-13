package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SharedGoalDTO {

    private Long id;

    @NotBlank(message = "Título da meta é obrigatório")
    @Size(max = 200, message = "Título deve ter no máximo 200 caracteres")
    private String title;

    @NotNull(message = "Valor objetivo é obrigatório")
    @Positive(message = "Valor objetivo deve ser positivo")
    private Double targetAmount;

    @NotNull(message = "Valor atual é obrigatório")
    @PositiveOrZero(message = "Valor atual não pode ser negativo")
    private Double currentAmount;

    @NotNull(message = "Data limite é obrigatória")
    private LocalDate deadline;

    @Size(max = 50, message = "Ícone deve ter no máximo 50 caracteres")
    private String icon;
}