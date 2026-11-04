package com.social.backend.repository;

import com.social.backend.entity.VipPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VipPlanRepository extends JpaRepository<VipPlan, Long> {
    List<VipPlan> findAllByOrderByPriceAsc();
    List<VipPlan> findByIsActiveTrueOrderByPriceAsc();
    Optional<VipPlan> findByPlanCode(String planCode);
    boolean existsByPlanCode(String planCode);
}
