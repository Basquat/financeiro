package com.financeiro.casal.service;

import com.financeiro.casal.model.SharedGoal;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.SharedGoalRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
public class SharedGoalService {

    private final SharedGoalRepository sharedGoalRepository;
    private final PartnerService partnerService;

    @Transactional
    public SharedGoal createSharedGoal(SharedGoal goal, User owner) {
        if (goal.getCurrentAmount() == null) {
            goal.setCurrentAmount(0.0);
        }
        goal.setOwner(owner);
        partnerService.partnershipOf(owner.getId()).ifPresent(goal::setPartnership);
        return sharedGoalRepository.save(goal);
    }

    /** Goals the user owns, plus goals shared through their partnership. */
    public List<SharedGoal> getVisibleGoals(User user) {
        return sharedGoalRepository.findVisibleTo(user.getId());
    }

    @Transactional
    public SharedGoal updateGoal(Long goalId, SharedGoal changes, User actor) {
        SharedGoal goal = getOrThrow(goalId, actor);
        goal.setTitle(changes.getTitle());
        goal.setTargetAmount(changes.getTargetAmount());
        goal.setDeadline(changes.getDeadline());
        goal.setIcon(changes.getIcon());
        return sharedGoalRepository.save(goal);
    }

    @Transactional
    public void deleteGoal(Long goalId, User actor) {
        sharedGoalRepository.delete(getOrThrow(goalId, actor));
    }

    @Transactional
    public SharedGoal contributeToGoal(Long goalId, Double amount, User actor) {
        if (amount == null || amount <= 0) {
            throw new RuntimeException("Informe um valor maior que zero");
        }
        SharedGoal goal = getOrThrow(goalId, actor);
        double newAmount = Math.min(goal.getCurrentAmount() + amount, goal.getTargetAmount());
        goal.setCurrentAmount(Math.round(newAmount * 100.0) / 100.0);
        return sharedGoalRepository.save(goal);
    }

    private SharedGoal getOrThrow(Long goalId, User actor) {
        SharedGoal goal = sharedGoalRepository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Meta não encontrada"));
        boolean mine = goal.getOwner() == null || goal.getOwner().getId().equals(actor.getId());
        boolean shared = goal.getPartnership() != null && goal.getPartnership().includes(actor.getId());
        if (!mine && !shared) {
            throw new RuntimeException("Esta meta não é sua");
        }
        return goal;
    }
}
