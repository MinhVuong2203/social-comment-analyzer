package com.social.backend.dto;

import lombok.Builder;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class PaymentDto {

    public record CreatePaymentRequest(
            Long vipPlanId,
            String returnUrl,
            String cancelUrl
    ) {}

    @Builder
    public record CreatePaymentResponse(
            Long orderCode,
            BigDecimal amount,
            String description,
            String checkoutUrl,
            String qrCode,
            String accountNumber,
            String accountName,
            String bin,
            String status,
            String paymentLinkId
    ) {}

    @Builder
    public record PaymentStatusResponse(
            Long orderCode,
            String status, // 'PENDING', 'SUCCESS', 'PAID', 'CANCELLED', 'FAILED'
            BigDecimal amount,
            String planName,
            OffsetDateTime paidAt,
            String message
    ) {}

    @Builder
    public record UserProfileResponse(
            Long id,
            String threadsUserId,
            String username,
            String name,
            String profilePictureUrl,
            String role,
            String status,
            boolean isVip,
            VipSubscriptionDetail activeSubscription,
            List<VipPlanDetail> availablePlans,
            List<PaymentTransactionDetail> paymentHistory
    ) {}

    @Builder
    public record VipSubscriptionDetail(
            Long id,
            String planCode,
            String planName,
            String status,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Long daysRemaining
    ) {}

    @Builder
    public record VipPlanDetail(
            Long id,
            String planCode,
            String planName,
            String description,
            BigDecimal price,
            Integer durationDays,
            Boolean isActive
    ) {}

    @Builder
    public record PaymentTransactionDetail(
            Long id,
            String orderCode,
            String paymentProvider,
            BigDecimal amount,
            String currency,
            String status,
            String paymentMethod,
            OffsetDateTime paidAt,
            OffsetDateTime createdAt
    ) {}
}

