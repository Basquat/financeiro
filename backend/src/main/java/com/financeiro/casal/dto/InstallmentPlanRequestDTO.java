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
public class InstallmentPlanRequestDTO {

    @NotBlank(message = "Título do plano é obrigatório")
    @Size(max = 200, message = "Título deve ter no máximo 200 caracteres")
    private String title;

    @NotNull(message = "Valor total é obrigatório")
    @Positive(message = "Valor total deve ser positivo")
    private Double totalAmount;

    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dueDate;

    @NotBlank(message = "Categoria é obrigatória")
    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    private String category;

    @NotNull(message = "Usuário é obrigatório")
    private Long userId;

    // Optional: how many installments are still to be paid. Defaults to 1 if omitted.
    @PositiveOrZero(message = "Número de parcelas não pode ser negativo")
    private Integer installmentsLeft;

    // Optional: amount still owed. Defaults to totalAmount if omitted.
    @PositiveOrZero(message = "Valor restante não pode ser negativo")
    private Double remainingAmount;
}