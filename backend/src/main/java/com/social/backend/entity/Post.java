package com.social.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "threads_post_id", unique = true, nullable = false)
    private String threadsPostId;

    @Column(name = "threads_user_id", nullable = false)
    private String threadsUserId;

    @Column(name = "text", columnDefinition = "TEXT")
    private String text;

    @Column(name = "permalink", length = 1024)
    private String permalink;

    @Column(name = "media_type")
    private String mediaType;

    @Column(name = "threads_timestamp")
    private String threadsTimestamp;

    @Column(name = "total_replies")
    @Builder.Default
    private Integer totalReplies = 0;

    @Column(name = "analyzed", nullable = false)
    @Builder.Default
    private Boolean analyzed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
