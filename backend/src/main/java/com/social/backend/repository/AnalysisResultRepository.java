package com.social.backend.repository;

import com.social.backend.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Long> {
    Optional<AnalysisResult> findFirstByThreadsPostIdOrderByCreatedAtDesc(String threadsPostId);
    List<AnalysisResult> findByThreadsUserIdOrderByCreatedAtDesc(String threadsUserId);
    long countByThreadsUserId(String threadsUserId);
}
