package com.social.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.social.backend.dto.PaymentDto;
import com.social.backend.entity.PaymentTransaction;
import com.social.backend.entity.User;
import com.social.backend.entity.UserSubscription;
import com.social.backend.entity.VipPlan;
import com.social.backend.repository.PaymentTransactionRepository;
import com.social.backend.repository.UserRepository;
import com.social.backend.repository.UserSubscriptionRepository;
import com.social.backend.repository.VipPlanRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PayOSService payOSService;
    private final VipPlanRepository vipPlanRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Tự động đồng bộ toàn bộ người dùng từ bảng 'users' sang 'app_users'
     * để thỏa mãn các khóa ngoại (Foreign Key Constraints) trên PostgreSQL.
     */
    @PostConstruct
    public void syncAllUsersToAppUsers() {
        try {
            jdbcTemplate.execute(
                    "INSERT INTO app_users (id, threads_user_id, account_status, created_at, updated_at) " +
                    "OVERRIDING SYSTEM VALUE " +
                    "SELECT id, threads_user_id, 'ACTIVE', NOW(), NOW() FROM users " +
                    "ON CONFLICT (threads_user_id) DO NOTHING"
            );
            log.info("Đã đồng bộ người dùng từ 'users' sang 'app_users' thành công.");
        } catch (Exception e) {
            log.warn("Lưu ý đồng bộ app_users khi khởi động: {}", e.getMessage());
        }
    }

    /**
     * Lấy hoặc tạo ID người dùng trong bảng 'app_users' tương ứng với user
     */
    public Long getOrCreateAppUserId(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User không hợp lệ.");
        }

        String threadsUserId = user.getThreadsUserId() != null && !user.getThreadsUserId().isBlank()
                ? user.getThreadsUserId()
                : "user_" + user.getId();

        try {
            // 1. Kiểm tra trong app_users theo threads_user_id
            List<Long> ids = jdbcTemplate.query(
                    "SELECT id FROM app_users WHERE threads_user_id = ?",
                    (rs, rowNum) -> rs.getLong("id"),
                    threadsUserId
            );
            if (!ids.isEmpty()) {
                return ids.get(0);
            }

            // 2. Chèn vào app_users với id trùng khớp bằng OVERRIDING SYSTEM VALUE
            List<Long> insertedIds = jdbcTemplate.query(
                    "INSERT INTO app_users (id, threads_user_id, account_status, created_at, updated_at) " +
                    "OVERRIDING SYSTEM VALUE VALUES (?, ?, 'ACTIVE', NOW(), NOW()) " +
                    "ON CONFLICT (threads_user_id) DO UPDATE SET updated_at = NOW() " +
                    "RETURNING id",
                    (rs, rowNum) -> rs.getLong("id"),
                    user.getId(), threadsUserId
            );
            if (!insertedIds.isEmpty()) {
                return insertedIds.get(0);
            }
        } catch (Exception e) {
            log.warn("OVERRIDING SYSTEM VALUE không khả dụng hoặc bị xung đột: {}. Thử chèn thông thường...", e.getMessage());
            try {
                List<Long> fallbackIds = jdbcTemplate.query(
                        "INSERT INTO app_users (threads_user_id, account_status, created_at, updated_at) " +
                        "VALUES (?, 'ACTIVE', NOW(), NOW()) " +
                        "ON CONFLICT (threads_user_id) DO UPDATE SET updated_at = NOW() " +
                        "RETURNING id",
                        (rs, rowNum) -> rs.getLong("id"),
                        threadsUserId
                );
                if (!fallbackIds.isEmpty()) {
                    return fallbackIds.get(0);
                }
            } catch (Exception ex) {
                log.error("Không thể chèn vào app_users: {}", ex.getMessage());
            }
        }

        return user.getId();
    }

    /**
     * Tạo yêu cầu thanh toán gói VIP bằng PayOS
     */
    @Transactional
    public PaymentDto.CreatePaymentResponse createPayment(User user, PaymentDto.CreatePaymentRequest request) {
        if (request.vipPlanId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn gói VIP cần mua.");
        }

        VipPlan plan = vipPlanRepository.findById(request.vipPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy gói VIP ID: " + request.vipPlanId()));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalStateException("Gói VIP này hiện đang tạm dừng mở bán.");
        }

        // Đảm bảo user_id tồn tại trong bảng app_users để không bị lỗi khóa ngoại foreign key
        Long appUserId = getOrCreateAppUserId(user);

        // Tạo mã đơn hàng duy nhất (chữ số, tối đa an toàn 9 số)
        long orderCode = (System.currentTimeMillis() % 900000000L) + 100000000L;

        // 1. Tạo bản ghi đăng ký gói VIP chờ kích hoạt (PENDING)
        UserSubscription subscription = UserSubscription.builder()
                .userId(appUserId)
                .vipPlanId(plan.getId())
                .status("PENDING")
                .build();
        subscription = userSubscriptionRepository.save(subscription);

        // 2. Tạo bản ghi giao dịch thanh toán (PENDING)
        PaymentTransaction transaction = PaymentTransaction.builder()
                .userId(appUserId)
                .subscriptionId(subscription.getId())
                .orderCode(String.valueOf(orderCode))
                .paymentProvider("PAYOS")
                .amount(plan.getPrice())
                .currency("VND")
                .status("PENDING")
                .paymentMethod("VIETQR")
                .build();
        paymentTransactionRepository.save(transaction);

        // URLs khi hoàn tất hoặc hủy
        String returnUrl = (request.returnUrl() != null && !request.returnUrl().isBlank())
                ? request.returnUrl()
                : "http://localhost:5173/#/profile?payment=success&orderCode=" + orderCode;

        String cancelUrl = (request.cancelUrl() != null && !request.cancelUrl().isBlank())
                ? request.cancelUrl()
                : "http://localhost:5173/#/profile?payment=cancel&orderCode=" + orderCode;

        // Mô tả giao dịch
        String description = "VIP " + plan.getDurationDays() + " ngay";

        // 3. Gọi cổng thanh toán PayOS
        if (payOSService.isConfigured()) {
            try {
                JsonNode payosData = payOSService.createPaymentLink(
                        orderCode,
                        plan.getPrice(),
                        description,
                        returnUrl,
                        cancelUrl
                );

                String checkoutUrl = payosData.has("checkoutUrl") ? payosData.get("checkoutUrl").asText() : "";
                String qrCode = payosData.has("qrCode") ? payosData.get("qrCode").asText() : "";
                String paymentLinkId = payosData.has("paymentLinkId") ? payosData.get("paymentLinkId").asText() : "";
                String accountNumber = payosData.has("accountNumber") ? payosData.get("accountNumber").asText() : "";
                String accountName = payosData.has("accountName") ? payosData.get("accountName").asText() : "";
                String bin = payosData.has("bin") ? payosData.get("bin").asText() : "";

                // Lưu lại paymentLinkId vào provider_transaction_id
                transaction.setProviderTransactionId(paymentLinkId);
                paymentTransactionRepository.save(transaction);

                return PaymentDto.CreatePaymentResponse.builder()
                        .orderCode(orderCode)
                        .amount(plan.getPrice())
                        .description(description)
                        .checkoutUrl(checkoutUrl)
                        .qrCode(qrCode)
                        .accountNumber(accountNumber)
                        .accountName(accountName)
                        .bin(bin)
                        .status("PENDING")
                        .paymentLinkId(paymentLinkId)
                        .build();

            } catch (Exception e) {
                log.error("Lỗi khi kết nối PayOS: {}", e.getMessage());
                throw new RuntimeException(e.getMessage());
            }
        } else {
            // Khi chưa điền keys vào application.properties, đưa ra cảnh báo hướng dẫn rõ ràng
            log.warn("Chưa cấu hình payos.client-id trong application.properties. Tạo mock checkout.");
            return PaymentDto.CreatePaymentResponse.builder()
                    .orderCode(orderCode)
                    .amount(plan.getPrice())
                    .description(description)
                    .checkoutUrl("https://pay.payos.vn/mock/" + orderCode)
                    .qrCode("")
                    .accountNumber("6910889701")
                    .accountName("NGUYEN MINH VUONG")
                    .bin("970415")
                    .status("PENDING_CONFIG")
                    .paymentLinkId("mock_" + orderCode)
                    .build();
        }
    }

    /**
     * Xử lý webhook từ PayOS khi giao dịch thành công
     */
    @Transactional
    public boolean handlePayOSWebhook(JsonNode webhookPayload) {
        log.info("Nhận Webhook từ PayOS: {}", webhookPayload);

        if (webhookPayload == null || !webhookPayload.has("data")) {
            return false;
        }

        JsonNode data = webhookPayload.get("data");
        String signature = webhookPayload.has("signature") ? webhookPayload.get("signature").asText() : "";

        // Xác thực chữ ký PayOS
        if (payOSService.isConfigured() && !payOSService.verifyWebhookSignature(data, signature)) {
            log.warn("Chữ ký PayOS Webhook không hợp lệ!");
            return false;
        }

        if (!data.has("orderCode")) {
            return false;
        }

        long orderCodeLong = data.get("orderCode").asLong();
        String orderCode = String.valueOf(orderCodeLong);

        String code = data.has("code") ? data.get("code").asText() : "";
        String desc = data.has("desc") ? data.get("desc").asText() : "";
        String reference = data.has("reference") ? data.get("reference").asText() : "";

        // code == "00" hoặc desc chứa success nghĩa là chuyển khoản thành công
        if ("00".equals(code) || "success".equalsIgnoreCase(desc)) {
            activateSuccessfulPayment(orderCode, reference);
            return true;
        }

        return true;
    }

    /**
     * Kiểm tra trạng thái giao dịch & kích hoạt gói nếu PayOS đã ghi nhận thanh toán
     */
    @Transactional
    public PaymentDto.PaymentStatusResponse checkAndSyncPaymentStatus(Long orderCode) {
        String orderCodeStr = String.valueOf(orderCode);
        PaymentTransaction tx = paymentTransactionRepository.findByOrderCode(orderCodeStr)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderCode));

        // Nếu đã thành công trước đó
        if ("SUCCESS".equalsIgnoreCase(tx.getStatus())) {
            UserSubscription sub = userSubscriptionRepository.findById(tx.getSubscriptionId()).orElse(null);
            VipPlan plan = sub != null ? sub.getVipPlan() : null;
            return PaymentDto.PaymentStatusResponse.builder()
                    .orderCode(orderCode)
                    .status("SUCCESS")
                    .amount(tx.getAmount())
                    .planName(plan != null ? plan.getPlanName() : "VIP")
                    .paidAt(tx.getPaidAt())
                    .message("Giao dịch đã được thanh toán thành công và kích hoạt VIP.")
                    .build();
        }

        // Nếu đang PENDING, chủ động gọi PayOS để xác minh trạng thái thực tế
        if (payOSService.isConfigured()) {
            JsonNode payosInfo = payOSService.getPaymentLinkInformation(orderCode);
            if (payosInfo != null && payosInfo.has("status")) {
                String payosStatus = payosInfo.get("status").asText();
                log.info("Trạng thái từ PayOS cho orderCode {}: {}", orderCode, payosStatus);

                if ("PAID".equalsIgnoreCase(payosStatus)) {
                    String ref = payosInfo.has("reference") ? payosInfo.get("reference").asText() : "";
                    activateSuccessfulPayment(orderCodeStr, ref);
                    tx = paymentTransactionRepository.findByOrderCode(orderCodeStr).orElse(tx);

                    UserSubscription sub = userSubscriptionRepository.findById(tx.getSubscriptionId()).orElse(null);
                    VipPlan plan = sub != null ? sub.getVipPlan() : null;
                    return PaymentDto.PaymentStatusResponse.builder()
                            .orderCode(orderCode)
                            .status("SUCCESS")
                            .amount(tx.getAmount())
                            .planName(plan != null ? plan.getPlanName() : "VIP")
                            .paidAt(tx.getPaidAt())
                            .message("Thanh toán thành công! Gói VIP đã được kích hoạt.")
                            .build();
                } else if ("CANCELLED".equalsIgnoreCase(payosStatus)) {
                    cancelPayment(orderCode, "Người dùng hủy thanh toán trên PayOS");
                    return PaymentDto.PaymentStatusResponse.builder()
                            .orderCode(orderCode)
                            .status("CANCELLED")
                            .amount(tx.getAmount())
                            .message("Giao dịch đã bị hủy.")
                            .build();
                }
            }
        }

        return PaymentDto.PaymentStatusResponse.builder()
                .orderCode(orderCode)
                .status(tx.getStatus())
                .amount(tx.getAmount())
                .message("Đang chờ thanh toán qua cổng VietQR PayOS...")
                .build();
    }

    /**
     * Hủy giao dịch thanh toán
     */
    @Transactional
    public boolean cancelPayment(Long orderCode, String reason) {
        String orderCodeStr = String.valueOf(orderCode);
        Optional<PaymentTransaction> txOpt = paymentTransactionRepository.findByOrderCode(orderCodeStr);
        if (txOpt.isEmpty()) {
            return false;
        }

        PaymentTransaction tx = txOpt.get();
        if ("SUCCESS".equalsIgnoreCase(tx.getStatus())) {
            log.warn("Không thể hủy giao dịch đã thành công #{}", orderCode);
            return false;
        }

        // Hủy trên PayOS
        payOSService.cancelPaymentLink(orderCode, reason);

        // Cập nhật Database
        tx.setStatus("CANCELLED");
        paymentTransactionRepository.save(tx);

        if (tx.getSubscriptionId() != null) {
            userSubscriptionRepository.findById(tx.getSubscriptionId()).ifPresent(sub -> {
                if ("PENDING".equalsIgnoreCase(sub.getStatus())) {
                    sub.setStatus("CANCELLED");
                    userSubscriptionRepository.save(sub);
                }
            });
        }

        log.info("Đã hủy đơn hàng thanh toán VIP #{}", orderCode);
        return true;
    }

    /**
     * Cập nhật Database khi giao dịch thành công
     */
    @Transactional
    public void activateSuccessfulPayment(String orderCode, String reference) {
        Optional<PaymentTransaction> txOpt = paymentTransactionRepository.findByOrderCode(orderCode);
        if (txOpt.isEmpty()) {
            log.warn("Không tìm thấy giao dịch với mã orderCode: {}", orderCode);
            return;
        }

        PaymentTransaction tx = txOpt.get();
        if ("SUCCESS".equalsIgnoreCase(tx.getStatus())) {
            return; // Đã kích hoạt rồi
        }

        OffsetDateTime now = OffsetDateTime.now();

        // 1. Cập nhật payment_transactions
        tx.setStatus("SUCCESS");
        tx.setPaidAt(now);
        if (reference != null && !reference.isBlank()) {
            tx.setProviderTransactionId(reference);
        }
        paymentTransactionRepository.save(tx);

        // 2. Kích hoạt user_subscriptions
        if (tx.getSubscriptionId() != null) {
            userSubscriptionRepository.findById(tx.getSubscriptionId()).ifPresent(sub -> {
                VipPlan plan = vipPlanRepository.findById(sub.getVipPlanId()).orElse(null);
                int duration = (plan != null && plan.getDurationDays() != null) ? plan.getDurationDays() : 30;

                // Kiểm tra xem user có đang có gói VIP active còn hạn không, nếu có thì cộng dồn ngày
                Optional<UserSubscription> currentActive = userSubscriptionRepository
                        .findFirstByUserIdAndStatusOrderByEndAtDesc(sub.getUserId(), "ACTIVE");

                OffsetDateTime start = now;
                OffsetDateTime end;

                if (currentActive.isPresent() && currentActive.get().getEndAt() != null
                        && currentActive.get().getEndAt().isAfter(now)) {
                    // Cộng dồn thời hạn nối tiếp
                    start = currentActive.get().getEndAt();
                    end = start.plusDays(duration);
                } else {
                    end = start.plusDays(duration);
                }

                sub.setStatus("ACTIVE");
                sub.setStartAt(now);
                sub.setEndAt(end);
                userSubscriptionRepository.save(sub);

                log.info("Đã kích hoạt gói VIP '{}' cho User #{} đến ngày {}",
                        plan != null ? plan.getPlanName() : "VIP",
                        sub.getUserId(),
                        end);
            });
        }
    }

    /**
     * Lấy dữ liệu hồ sơ cá nhân, gói VIP hiện tại và lịch sử
     */
    @Transactional(readOnly = true)
    public PaymentDto.UserProfileResponse getUserProfile(User user) {
        OffsetDateTime now = OffsetDateTime.now();
        Long appUserId = getOrCreateAppUserId(user);

        // Kiểm tra subscription active
        Optional<UserSubscription> activeSubOpt = userSubscriptionRepository
                .findFirstByUserIdAndStatusOrderByEndAtDesc(appUserId, "ACTIVE");

        if (activeSubOpt.isEmpty() && !appUserId.equals(user.getId())) {
            activeSubOpt = userSubscriptionRepository
                    .findFirstByUserIdAndStatusOrderByEndAtDesc(user.getId(), "ACTIVE");
        }

        PaymentDto.VipSubscriptionDetail activeSub = null;
        boolean isVip = false;

        if (activeSubOpt.isPresent()) {
            UserSubscription sub = activeSubOpt.get();
            if (sub.getEndAt() == null || sub.getEndAt().isAfter(now)) {
                isVip = true;
                long daysLeft = sub.getEndAt() != null ? Math.max(0, ChronoUnit.DAYS.between(now, sub.getEndAt())) : 999;
                VipPlan plan = sub.getVipPlan();
                activeSub = PaymentDto.VipSubscriptionDetail.builder()
                        .id(sub.getId())
                        .planCode(plan != null ? plan.getPlanCode() : "VIP")
                        .planName(plan != null ? plan.getPlanName() : "Gói VIP")
                        .status(sub.getStatus())
                        .startAt(sub.getStartAt())
                        .endAt(sub.getEndAt())
                        .daysRemaining(daysLeft)
                        .build();
            }
        }

        // Danh sách các gói VIP đang mở bán
        List<PaymentDto.VipPlanDetail> availablePlans = vipPlanRepository.findByIsActiveTrueOrderByPriceAsc()
                .stream()
                .map(p -> PaymentDto.VipPlanDetail.builder()
                        .id(p.getId())
                        .planCode(p.getPlanCode())
                        .planName(p.getPlanName())
                        .description(p.getDescription())
                        .price(p.getPrice())
                        .durationDays(p.getDurationDays())
                        .isActive(p.getIsActive())
                        .build())
                .collect(Collectors.toList());

        // Lịch sử thanh toán của người dùng
        List<PaymentTransaction> historyList = paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(appUserId);
        if (historyList.isEmpty() && !appUserId.equals(user.getId())) {
            historyList = paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        }

        List<PaymentDto.PaymentTransactionDetail> paymentHistory = historyList.stream()
                .map(tx -> PaymentDto.PaymentTransactionDetail.builder()
                        .id(tx.getId())
                        .orderCode(tx.getOrderCode())
                        .paymentProvider(tx.getPaymentProvider())
                        .amount(tx.getAmount())
                        .currency(tx.getCurrency())
                        .status(tx.getStatus())
                        .paymentMethod(tx.getPaymentMethod())
                        .paidAt(tx.getPaidAt())
                        .createdAt(tx.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return PaymentDto.UserProfileResponse.builder()
                .id(user.getId())
                .threadsUserId(user.getThreadsUserId())
                .username(user.getUsername())
                .name(user.getName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .role(user.getRole() != null ? user.getRole().name() : "USER")
                .status(user.getStatus() != null ? user.getStatus().name() : "ACTIVE")
                .isVip(isVip)
                .activeSubscription(activeSub)
                .availablePlans(availablePlans)
                .paymentHistory(paymentHistory)
                .build();
    }
}
