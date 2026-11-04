package com.social.backend.dto;

import java.time.LocalDateTime;

public class AdminDto {
    public record LoginRequest(
            String username,
            String password
    ) {}

    public record UserSummary(
            Long id,
            String threadsUserId,
            String username,
            String name,
            String profilePictureUrl,
            String role,
            String status,
            LocalDateTime blockedUntil,
            String blockReason,
            LocalDateTime createdAt,
            LocalDateTime lastLoginAt,
            long postsAnalyzedCount
    ) {}

    public record SystemStats(
            long totalUsers,
            long activeUsers,
            long blockedUsers,
            long totalPostsAnalyzed,
            long totalCommentsAnalyzed,
            long toxicCount,
            long nonToxicCount,
            long hateCount,
            long cleanCount,
            long offensiveCount,
            long positiveCount,
            long neutralCount,
            long negativeCount
    ) {}

    public record StatusUpdateRequest(
            String status
    ) {}

    public record UserLockRequest(
            String duration, // "1_DAY", "7_DAYS", "30_DAYS", "PERMANENT"
            String reason
    ) {}
}
