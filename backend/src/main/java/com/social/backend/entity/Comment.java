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

    /**
     * ID của bình luận cha mà bình luận này reply tới (nếu là reply con cấp 2, 3...)
     * Null nếu là bình luận cấp 1 trực tiếp của bài viết.
     */
    @Column(name = "parent_id")
    private String parentId;

    /**
     * true nếu là reply con, false nếu là bình luận cấp 1
     */
    @Column(name = "is_reply")
    @Builder.Default
    private Boolean isReply = false;

    @Column(name = "username")
    private String username;

    @Column(name = "profile_picture_url", length = 1024)
    private String profilePictureUrl;

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
