package com.social.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "threads_user_id", unique = true, nullable = false)
    private String threadsUserId;

    @Column(name = "username")
    private String username;

    @Column(name = "name")
    private String name;

    @Column(name = "profile_picture_url", length = 1024)
    private String profilePictureUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "blocked_until")
    private LocalDateTime blockedUntil;

    @Column(name = "block_reason", length = 500)
    private String blockReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        lastLoginAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Role {
        USER,
        ADMIN
    }

    public enum UserStatus {
        ACTIVE,
        BLOCKED
    }

    public boolean isCurrentlyBlocked() {
        if (this.status != UserStatus.BLOCKED) {
            return false;
        }
        if (this.blockedUntil != null && LocalDateTime.now().isAfter(this.blockedUntil)) {
            return false;
        }
        return true;
    }
}
