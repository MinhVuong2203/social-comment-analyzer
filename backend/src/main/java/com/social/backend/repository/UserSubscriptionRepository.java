package com.social.backend.repository;

import com.social.backend.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    List<UserSubscription> findAllByOrderByCreatedAtDesc();
    List<UserSubscription> findByStatusOrderByCreatedAtDesc(String status);
    long countByVipPlanIdAndStatus(Long vipPlanId, String status);
    long countByStatus(String status);
    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);
}

