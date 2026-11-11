package com.social.backend.repository;

import com.social.backend.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Long> {
    Optional<AnalysisResult> findFirstByThreadsPostIdOrderByCreatedAtDesc(String threadsPostId);
    List<AnalysisResult> findByThreadsUserIdOrderByCreatedAtDesc(String threadsUserId);
    long countByThreadsUserId(String threadsUserId);
    long countByThreadsUserIdAndCreatedAtBetween(String threadsUserId, LocalDateTime start, LocalDateTime end);
    List<AnalysisResult> findByCreatedAtGreaterThanEqual(LocalDateTime since);
    List<AnalysisResult> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
