package com.financeiro.casal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Inputs the user provides on the "Planejar" tab so the budget split can be recomputed. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetSettingsDTO {
    private Double housingCost;
    private Integer householdSize;
    private Boolean paysFood;
    private Double foodPerPerson;
    private Double emergencySaved;
    private Boolean usesHouseholdIncome;
}
