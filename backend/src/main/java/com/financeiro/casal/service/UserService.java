package com.financeiro.casal.service;

import com.financeiro.casal.dto.BudgetSettingsDTO;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    @Transactional
    public User updateSalary(Long userId, Double salary) {
        User user = getById(userId);
        user.setSalary(salary);
        return userRepository.save(user);
    }

    @Transactional
    public User updateName(Long userId, String name) {
        User user = getById(userId);
        user.setName(name);
        return userRepository.save(user);
    }

    /** {@code avatarUrl} may be an http(s) URL, a data: URI, or null to remove the photo. */
    @Transactional
    public User updateAvatar(Long userId, String avatarUrl) {
        String trimmed = avatarUrl == null || avatarUrl.isBlank() ? null : avatarUrl.trim();
        if (trimmed != null && trimmed.length() > 700_000) {
            throw new RuntimeException("Imagem muito grande. Escolha uma menor.");
        }
        User user = getById(userId);
        user.setAvatarUrl(trimmed);
        return userRepository.save(user);
    }

    @Transactional
    public User updateBudget(Long userId, BudgetSettingsDTO b) {
        User user = getById(userId);
        user.setHousingCost(nonNegative(b.getHousingCost()));
        user.setHouseholdSize(b.getHouseholdSize() == null ? null : Math.max(1, b.getHouseholdSize()));
        user.setPaysFood(b.getPaysFood());
        user.setFoodPerPerson(nonNegative(b.getFoodPerPerson()));
        user.setEmergencySaved(nonNegative(b.getEmergencySaved()));
        user.setBudgetUsesHouseholdIncome(b.getUsesHouseholdIncome());
        return userRepository.save(user);
    }

    private static Double nonNegative(Double v) {
        if (v == null) return null;
        return v < 0 ? 0.0 : v;
    }
}
