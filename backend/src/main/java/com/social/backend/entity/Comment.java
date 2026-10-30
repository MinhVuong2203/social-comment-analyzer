package com.social.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "threads_comment_id", unique = true, nullable = false)
    private String threadsCommentId;

    @Column(name = "threads_post_id", nullable = false)
    private String threadsPostId;

    @Column(name = "username")
    private String username;

    @Column(name = "text", columnDefinition = "TEXT")
    private String text;

    @Column(name = "threads_timestamp")
    private String threadsTimestamp;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
