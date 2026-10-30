package com.social.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "analysis_results", indexes = {
    @Index(name = "idx_analysis_post_id", columnList = "threads_post_id"),
    @Index(name = "idx_analysis_user_id", columnList = "threads_user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "threads_post_id", nullable = false)
    private String threadsPostId;

    @Column(name = "threads_user_id", nullable = false)
    private String threadsUserId;

    @Column(name = "total_comments")
    @Builder.Default
    private Integer totalComments = 0;

    @Column(name = "toxic_count")
    @Builder.Default
    private Integer toxicCount = 0;

    @Column(name = "non_toxic_count")
    @Builder.Default
    private Integer nonToxicCount = 0;

    @Column(name = "clean_count")
    @Builder.Default
    private Integer cleanCount = 0;

    @Column(name = "offensive_count")
    @Builder.Default
    private Integer offensiveCount = 0;

    @Column(name = "hate_count")
    @Builder.Default
    private Integer hateCount = 0;

    @Column(name = "positive_count")
    @Builder.Default
    private Integer positiveCount = 0;

    @Column(name = "neutral_count")
    @Builder.Default
    private Integer neutralCount = 0;

    @Column(name = "negative_count")
    @Builder.Default
    private Integer negativeCount = 0;

    @Column(name = "summary_json", columnDefinition = "TEXT")
    private String summaryJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
