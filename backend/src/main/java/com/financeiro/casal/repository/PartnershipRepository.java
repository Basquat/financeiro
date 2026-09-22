package com.financeiro.casal.repository;

import com.financeiro.casal.model.Partnership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PartnershipRepository extends JpaRepository<Partnership, Long> {

    @Query("select p from Partnership p where p.userA.id = :uid or p.userB.id = :uid")
    Optional<Partnership> findForUser(@Param("uid") Long userId);
}
