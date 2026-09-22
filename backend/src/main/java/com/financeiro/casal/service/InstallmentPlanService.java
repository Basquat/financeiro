package com.financeiro.casal.service;

import com.financeiro.casal.model.InstallmentPlan;
import com.financeiro.casal.model.Transaction;
import com.financeiro.casal.model.User;
import com.financeiro.casal.repository.InstallmentPlanRepository;
import com.financeiro.casal.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
public class InstallmentPlanService {

    private final InstallmentPlanRepository installmentPlanRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;

    public InstallmentPlan createInstallmentPlan(InstallmentPlan plan, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        plan.setUser(user);
        if (plan.getRemainingAmount() == null) {
            plan.setRemainingAmount(plan.getTotalAmount());
        }
        if (plan.getInstallmentsLeft() == null) {
            plan.setInstallmentsLeft(1);
        }
        return installmentPlanRepository.save(plan);
    }

    public List<InstallmentPlan> getUserInstallmentPlans(Long userId) {
        return installmentPlanRepository.findByUserId(userId);
    }

    @Transactional
    public InstallmentPlan updatePlan(Long id, InstallmentPlan changes, User actor) {
        InstallmentPlan plan = get(id, actor);
        plan.setTitle(changes.getTitle());
        plan.setTotalAmount(changes.getTotalAmount());
        plan.setCategory(changes.getCategory());
        plan.setDueDate(changes.getDueDate());
        if (changes.getRemainingAmount() != null) plan.setRemainingAmount(changes.getRemainingAmount());
        if (changes.getInstallmentsLeft() != null) plan.setInstallmentsLeft(changes.getInstallmentsLeft());
        return installmentPlanRepository.save(plan);
    }

    @Transactional
    public void deletePlan(Long id, User actor) {
        installmentPlanRepository.delete(get(id, actor));
    }

    /**
     * Registers one paid installment: drops the remaining amount and the count by one.
     * When {@code accountId} is given, also books the payment as an expense on that account.
     */
    @Transactional
    public InstallmentPlan payInstallment(Long id, Long accountId, User actor) {
        InstallmentPlan plan = get(id, actor);
        int left = plan.getInstallmentsLeft() == null ? 0 : plan.getInstallmentsLeft();
        double remaining = plan.getRemainingAmount() == null ? 0.0 : plan.getRemainingAmount();
        if (left <= 0 || remaining <= 0) {
            throw new RuntimeException("Este parcelamento já está quitado");
        }

        double installmentValue = Math.round((remaining / left) * 100.0) / 100.0;
        plan.setInstallmentsLeft(left - 1);
        plan.setRemainingAmount(left - 1 == 0 ? 0.0 : Math.round((remaining - installmentValue) * 100.0) / 100.0);
        InstallmentPlan saved = installmentPlanRepository.save(plan);

        if (accountId != null) {
            Transaction expense = Transaction.builder()
                    .title("Parcela — " + plan.getTitle())
                    .amount(-installmentValue)
                    .transactionDate(LocalDateTime.now())
                    .type(Transaction.TransactionType.EXPENSE)
                    .category(plan.getCategory())
                    .build();
            transactionService.createTransaction(expense, actor.getId(), accountId);
        }
        return saved;
    }

    private InstallmentPlan get(Long id, User actor) {
        InstallmentPlan plan = installmentPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcelamento não encontrado"));
        if (plan.getUser() != null && !plan.getUser().getId().equals(actor.getId())) {
            throw new RuntimeException("Este parcelamento é de outra pessoa");
        }
        return plan;
    }
}
