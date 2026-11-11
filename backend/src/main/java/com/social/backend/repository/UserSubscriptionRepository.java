package com.social.backend.repository;

import com.social.backend.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    List<UserSubscription> findAllByOrderByCreatedAtDesc();
    List<UserSubscription> findByStatusOrderByCreatedAtDesc(String status);
    long countByVipPlanIdAndStatus(Long vipPlanId, String status);
    long countByStatus(String status);
    long countByStatusAndCreatedAtGreaterThanEqual(String status, OffsetDateTime since);
    long countByStatusAndCreatedAtBetween(String status, OffsetDateTime start, OffsetDateTime end);
    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<UserSubscription> findFirstByUserIdAndStatusOrderByEndAtDesc(Long userId, String status);
}
