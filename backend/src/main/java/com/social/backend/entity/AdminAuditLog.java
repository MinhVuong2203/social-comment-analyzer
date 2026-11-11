package com.social.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_audit_logs", indexes = {
    @Index(name = "idx_audit_created_at", columnList = "created_at"),
    @Index(name = "idx_audit_admin", columnList = "admin_username")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_username", nullable = false, length = 100)
    @Builder.Default
    private String adminUsername = "admin";

    @Column(name = "action", nullable = false, length = 50)
    private String action; // LOCK_USER, UNLOCK_USER, GRANT_VIP, CREATE_PLAN, UPDATE_PLAN, TOGGLE_PLAN, DELETE_PLAN, ADMIN_LOGIN

    @Column(name = "target_type", length = 50)
    private String targetType; // USER, VIP_PLAN, AUTH, SYSTEM

    @Column(name = "target_id", length = 100)
    private String targetId;

    @Column(name = "description", nullable = false, length = 500)
    private String description;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
