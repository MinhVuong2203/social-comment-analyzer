package com.social.backend.repository;

import com.social.backend.entity.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    Optional<Prediction> findByThreadsCommentId(String threadsCommentId);
    List<Prediction> findByThreadsPostId(String threadsPostId);
    long countByToxicityLabel(String toxicityLabel);
    long countByHateSpeechLabel(String hateSpeechLabel);
    long countBySentimentLabel(String sentimentLabel);
}
