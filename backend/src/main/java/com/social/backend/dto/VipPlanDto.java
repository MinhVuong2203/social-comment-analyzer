package com.social.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class VipPlanDto {

    public record PlanRequest(
            @NotBlank(message = "Mã gói không được để trống")
            String planCode,

            @NotBlank(message = "Tên gói không được để trống")
            String planName,

            String description,

            @NotNull(message = "Giá không được để trống")
            @Min(value = 0, message = "Giá gói phải lớn hơn hoặc bằng 0")
            BigDecimal price,

            @NotNull(message = "Thời hạn ngày không được để trống")
            @Min(value = 1, message = "Thời hạn tối thiểu là 1 ngày")
            Integer durationDays,

            Boolean isActive
    ) {}

    @Builder
    public record PlanResponse(
            Long id,
            String planCode,
            String planName,
            String description,
            BigDecimal price,
            Integer durationDays,
            Boolean isActive,
            long activeSubscribers,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}

    public record StatusUpdateRequest(
            @NotBlank(message = "Trạng thái không được để trống")
            String status
    ) {}

    public record ManualGrantRequest(
            @NotNull(message = "User ID không được để trống")
            Long userId,

            @NotNull(message = "Gói VIP không được để trống")
            Long vipPlanId,

            Integer customDurationDays
    ) {}

    @Builder
    public record SubscriptionResponse(
            Long id,
            Long userId,
            String threadsUserId,
            String username,
            Long vipPlanId,
            String planCode,
            String planName,
            String status,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Long daysRemaining,
            OffsetDateTime createdAt
    ) {}

    @Builder
    public record OverviewStats(
            long totalPlans,
            long activePlans,
            long activeSubscriptions,
            long pendingSubscriptions,
            BigDecimal totalRevenue,
            long totalTransactions
    ) {}
}

