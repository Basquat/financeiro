package com.financeiro.casal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionRequestDTO {

    @NotBlank(message = "Título da transação é obrigatório")
    @Size(max = 200, message = "Título deve ter no máximo 200 caracteres")
    private String title;

    @NotNull(message = "Valor é obrigatório")
    private Double amount; // negative for expenses, positive for income

    @NotNull(message = "Data da transação é obrigatória")
    private LocalDateTime transactionDate;

    @NotNull(message = "Tipo é obrigatório")
    private TransactionType type;

    @NotBlank(message = "Categoria é obrigatória")
    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    private String category;

    @NotNull(message = "Usuário é obrigatório")
    private Long userId;

    @NotNull(message = "Conta é obrigatória")
    private Long accountId;

    // Installment information (optional)
    private Integer installmentCurrent;
    private Integer installmentTotal;

    public enum TransactionType {
        INCOME,
        EXPENSE
    }
}