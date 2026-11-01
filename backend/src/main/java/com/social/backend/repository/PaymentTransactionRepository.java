package com.social.backend.repository;

import com.social.backend.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
    List<PaymentTransaction> findByStatusOrderByCreatedAtDesc(String status);
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
}

