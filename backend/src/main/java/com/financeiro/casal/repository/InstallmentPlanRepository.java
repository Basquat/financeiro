package com.financeiro.casal.repository;

import com.financeiro.casal.model.InstallmentPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InstallmentPlanRepository extends JpaRepository<InstallmentPlan, Long> {
    List<InstallmentPlan> findByUserId(Long userId);
}