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

    public record UserQuotaSummary(
            boolean unlimited,
            long todayAnalysisCount,
            int dailyAnalyzeLimit,
            int remainingAnalysis,
            long todayExportCount,
            int dailyExportLimit,
            int remainingExports,
            long totalPostsCount,
            long totalAnalysisRuns,
            long totalCommentsAnalyzed,
            long totalToxicComments,
            long totalHateComments,
            double totalSpentVnd
    ) {}

    public record UserPostActivityItem(
            String threadsPostId,
            String text,
            String permalink,
            Integer totalReplies,
            boolean analyzed,
            LocalDateTime createdAt,
            LocalDateTime analyzedAt,
            int analyzedComments,
            int toxicCount,
            int hateCount,
            int offensiveCount,
            int positiveCount,
            int neutralCount,
            int negativeCount,
            int toxicPercentage
    ) {}

    public record UserSubscriptionHistoryItem(
            Long id,
            String planCode,
            String planName,
            String status,
            java.math.BigDecimal price,
            Integer durationDays,
            java.time.OffsetDateTime startAt,
            java.time.OffsetDateTime endAt,
            java.time.OffsetDateTime createdAt
    ) {}

    public record UserPaymentHistoryItem(
            Long id,
            String orderCode,
            String paymentProvider,
            String paymentMethod,
            java.math.BigDecimal amount,
            String currency,
            String status,
            java.time.OffsetDateTime paidAt,
            java.time.OffsetDateTime createdAt
    ) {}

    public record UserAuditLogItem(
            Long id,
            String adminUsername,
            String action,
            String targetType,
            String targetId,
            String description,
            LocalDateTime createdAt
    ) {}

    public record UserActivityDrilldown(
            UserSummary user,
            UserQuotaSummary quota,
            java.util.List<UserPostActivityItem> recentPosts,
            java.util.List<UserSubscriptionHistoryItem> subscriptions,
            java.util.List<UserPaymentHistoryItem> payments,
            java.util.List<UserAuditLogItem> auditLogs
    ) {}
}
