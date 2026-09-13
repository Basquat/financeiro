package com.financeiro.casal.dto;

import com.financeiro.casal.model.User;
import jakarta.validation.constraints.Email;
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
public class UserDTO {

    private Long id;

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email deve ser válido")
    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
    private String name;

    private String avatarUrl;

    private Double salary;

    private BudgetSettingsDTO budget;

    public static UserDTO from(User u) {
        return UserDTO.builder()
                .id(u.getId())
                .email(u.getEmail())
                .name(u.getName())
                .avatarUrl(u.getAvatarUrl())
                .salary(u.getSalary())
                .budget(BudgetSettingsDTO.builder()
                        .housingCost(u.getHousingCost())
                        .householdSize(u.getHouseholdSize())
                        .paysFood(u.getPaysFood())
                        .foodPerPerson(u.getFoodPerPerson())
                        .emergencySaved(u.getEmergencySaved())
                        .usesHouseholdIncome(u.getBudgetUsesHouseholdIncome())
                        .build())
                .build();
    }
}