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
public class InstallmentPlanDTO {

    private Long id;

    @NotBlank(message = "Título do plano é obrigatório")
    @Size(max = 200, message = "Título deve ter no máximo 200 caracteres")
    private String title;

    @NotNull(message = "Valor total é obrigatório")
    @Positive(message = "Valor total deve ser positivo")
    private Double totalAmount;

    @NotNull(message = "Valor restante é obrigatório")
    @PositiveOrZero(message = "Valor restante não pode ser negativo")
    private Double remainingAmount;

    @NotNull(message = "Número de parcelas restantes é obrigatório")
    @PositiveOrZero(message = "Número de parcelas restantes não pode ser negativo")
    private Integer installmentsLeft;

    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dueDate;

    @NotBlank(message = "Categoria é obrigatória")
    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    private String category;

    private UserSummaryDTO user;
}