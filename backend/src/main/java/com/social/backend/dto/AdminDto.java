package com.social.backend.dto;

import java.time.LocalDateTime;
import java.util.Map;

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
            long negativeCount,
            Double usersGrowthRate,
            Double commentsGrowthRate,
            Long newUsersCount
    ) {}

    public record ToxicPostAlert(
            Long id,
            String threadsPostId,
            String threadsUserId,
            String authorUsername,
            String postText,
            String permalink,
            int totalComments,
            int toxicCount,
            int nonToxicCount,
            int hateCount,
            int offensiveCount,
            int negativeCount,
            int toxicPercentage,
            String alertLevel,
            LocalDateTime createdAt
    ) {}

    public record StatusUpdateRequest(
            String status
    ) {}

    public record UserLockRequest(
            String duration, // "1_DAY", "7_DAYS", "30_DAYS", "PERMANENT"
            String reason
    ) {}

    public record AiHealthStatus(
            String status,                // "ONLINE", "DEGRADED", "OFFLINE"
            Long latencyMs,               // Độ trễ ping healthcheck (ms)
            Long inferenceLatencyMs,      // Độ trễ suy luận mô hình PhoBERT thực tế (ms)
            String device,                // "cpu", "cuda:0", "N/A"
            Map<String, Boolean> models,  // {"toxicity": true, "hate_speech": true, "sentiment": true}
            Map<String, Object> teencode, // {"dictionary_size": 135, "status": "ready"}
            long totalPredictions,        // Tổng số lượt bình luận đã phân tích trong DB
            LocalDateTime lastCheckedAt,  // Thời điểm kiểm tra
            String message                // Diễn giải trạng thái
    ) {}
}
