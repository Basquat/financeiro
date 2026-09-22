package com.financeiro.casal.repository;

import com.financeiro.casal.model.SharedGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SharedGoalRepository extends JpaRepository<SharedGoal, Long> {

    @Query("""
        select g from SharedGoal g
        where g.owner.id = :uid
           or (g.partnership is not null and (g.partnership.userA.id = :uid or g.partnership.userB.id = :uid))
        """)
    List<SharedGoal> findVisibleTo(@Param("uid") Long userId);

    List<SharedGoal> findByPartnershipId(Long partnershipId);
}
