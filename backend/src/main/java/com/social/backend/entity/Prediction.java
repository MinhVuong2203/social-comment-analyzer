package com.social.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "predictions", indexes = {
    @Index(name = "idx_pred_comment_id", columnList = "threads_comment_id"),
    @Index(name = "idx_pred_post_id", columnList = "threads_post_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "threads_comment_id", nullable = false)
    private String threadsCommentId;

    @Column(name = "threads_post_id", nullable = false)
    private String threadsPostId;

    @Column(name = "toxicity_label")
    private String toxicityLabel;

    @Column(name = "toxicity_confidence")
    private Double toxicityConfidence;

    @Column(name = "hate_speech_label")
    private String hateSpeechLabel;

    @Column(name = "hate_speech_confidence")
    private Double hateSpeechConfidence;

    @Column(name = "sentiment_label")
    private String sentimentLabel;

    @Column(name = "sentiment_confidence")
    private Double sentimentConfidence;

    @Column(name = "raw_probabilities_json", columnDefinition = "TEXT")
    private String rawProbabilitiesJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
