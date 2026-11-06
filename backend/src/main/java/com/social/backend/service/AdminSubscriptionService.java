package com.social.backend.service;

import com.social.backend.dto.VipPlanDto;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminSubscriptionService {

    private final VipPlanRepository vipPlanRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;

    /**
     * Khởi tạo các gói VIP mặc định từ Database Schema nếu bảng còn trống
     */
    @PostConstruct
    public void initDefaultPlans() {
        try {
            if (vipPlanRepository.count() == 0) {
                log.info("Bảng vip_plans chưa có dữ liệu, đang khởi tạo 3 gói VIP mẫu...");
                List<VipPlan> defaults = List.of(
                        VipPlan.builder()
                                .planCode("VIP_30_DAYS")
                                .planName("VIP 30 ngày")
                                .description("Quyền sử dụng VIP trong 30 ngày")
                                .price(new BigDecimal("99000"))
                                .durationDays(30)
                                .isActive(true)
                                .build(),
                        VipPlan.builder()
                                .planCode("VIP_90_DAYS")
                                .planName("VIP 90 ngày")
                                .description("Quyền sử dụng VIP trong 90 ngày")
                                .price(new BigDecimal("249000"))
                                .durationDays(90)
                                .isActive(true)
                                .build(),
                        VipPlan.builder()
                                .planCode("VIP_365_DAYS")
                                .planName("VIP 365 ngày")
                                .description("Quyền sử dụng VIP trong 365 ngày")
                                .price(new BigDecimal("799000"))
                                .durationDays(365)
                                .isActive(true)
                                .build()
                );
                vipPlanRepository.saveAll(defaults);
                log.info("Đã khởi tạo thành công 3 gói VIP.");
            }
        } catch (Exception e) {
            log.warn("Không thể nạp dữ liệu gói VIP mặc định (có thể bảng chưa được sinh): {}", e.getMessage());
        }
    }

    /**
     * Lấy toàn bộ danh sách gói VIP kèm số lượng hội viên đang hoạt động
     */
    @Transactional(readOnly = true)
    public List<VipPlanDto.PlanResponse> getAllPlans() {
        List<VipPlan> plans = vipPlanRepository.findAllByOrderByPriceAsc();
        List<VipPlanDto.PlanResponse> results = new ArrayList<>();

        for (VipPlan p : plans) {
            long activeSubs = userSubscriptionRepository.countByVipPlanIdAndStatus(p.getId(), "ACTIVE");
            results.add(VipPlanDto.PlanResponse.builder()
                    .id(p.getId())
                    .planCode(p.getPlanCode())
                    .planName(p.getPlanName())
                    .description(p.getDescription())
                    .price(p.getPrice())
                    .durationDays(p.getDurationDays())
                    .isActive(p.getIsActive())
                    .activeSubscribers(activeSubs)
                    .createdAt(p.getCreatedAt())
                    .updatedAt(p.getUpdatedAt())
                    .build());
        }
        return results;
    }

    /**
     * Thêm gói VIP mới
     */
    @Transactional
    public VipPlan createPlan(VipPlanDto.PlanRequest request) {
        String cleanCode = request.planCode().trim().toUpperCase();
        if (vipPlanRepository.existsByPlanCode(cleanCode)) {
            throw new IllegalArgumentException("Mã gói VIP '" + cleanCode + "' đã tồn tại!");
        }

        VipPlan plan = VipPlan.builder()
                .planCode(cleanCode)
                .planName(request.planName().trim())
                .description(request.description())
                .price(request.price())
                .durationDays(request.durationDays())
                .isActive(request.isActive() != null ? request.isActive() : true)
                .build();

        return vipPlanRepository.save(plan);
    }

    /**
     * Cập nhật thông tin gói VIP
     */
    @Transactional
    public VipPlan updatePlan(Long id, VipPlanDto.PlanRequest request) {
        VipPlan plan = vipPlanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy gói VIP ID: " + id));

        String cleanCode = request.planCode().trim().toUpperCase();
        if (!plan.getPlanCode().equalsIgnoreCase(cleanCode) && vipPlanRepository.existsByPlanCode(cleanCode)) {
            throw new IllegalArgumentException("Mã gói VIP '" + cleanCode + "' đã được sử dụng bởi gói khác!");
        }

        plan.setPlanCode(cleanCode);
        plan.setPlanName(request.planName().trim());
        plan.setDescription(request.description());
        plan.setPrice(request.price());
        plan.setDurationDays(request.durationDays());
        if (request.isActive() != null) {
            plan.setIsActive(request.isActive());
        }

        return vipPlanRepository.save(plan);
    }

    /**
     * Bật / Tắt trạng thái kích hoạt của gói VIP
     */
    @Transactional
    public VipPlan togglePlanActive(Long id) {
        VipPlan plan = vipPlanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy gói VIP ID: " + id));

        plan.setIsActive(!Boolean.TRUE.equals(plan.getIsActive()));
        return vipPlanRepository.save(plan);
    }

    /**
     * Xóa gói VIP
     */
    @Transactional
    public void deletePlan(Long id) {
        VipPlan plan = vipPlanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy gói VIP ID: " + id));

        long count = userSubscriptionRepository.countByVipPlanIdAndStatus(id, "ACTIVE");
        if (count > 0) {
            throw new IllegalStateException("Không thể xóa gói VIP đang có " + count + " hội viên hoạt động. Bạn có thể vô hiệu hóa gói này thay vì xóa.");
        }

        vipPlanRepository.delete(plan);
    }

    /**
     * Lấy danh sách đăng ký VIP người dùng
     */
    @Transactional(readOnly = true)
    public List<VipPlanDto.SubscriptionResponse> getAllSubscriptions(String statusFilter) {
        List<UserSubscription> list = (statusFilter != null && !statusFilter.isBlank())
                ? userSubscriptionRepository.findByStatusOrderByCreatedAtDesc(statusFilter.toUpperCase())
                : userSubscriptionRepository.findAllByOrderByCreatedAtDesc();

        Map<Long, User> userCache = new HashMap<>();
        OffsetDateTime now = OffsetDateTime.now();

        List<VipPlanDto.SubscriptionResponse> responseList = new ArrayList<>();
        for (UserSubscription s : list) {
            User user = userCache.computeIfAbsent(s.getUserId(), uId -> userRepository.findById(uId).orElse(null));

            Long daysLeft = null;
            if (s.getEndAt() != null) {
                long days = ChronoUnit.DAYS.between(now, s.getEndAt());
                daysLeft = Math.max(0, days);
            }

            VipPlan plan = s.getVipPlan();
            String planCode = plan != null ? plan.getPlanCode() : "N/A";
            String planName = plan != null ? plan.getPlanName() : ("Gói #" + s.getVipPlanId());

            responseList.add(VipPlanDto.SubscriptionResponse.builder()
                    .id(s.getId())
                    .userId(s.getUserId())
                    .threadsUserId(user != null ? user.getThreadsUserId() : null)
                    .username(user != null ? user.getUsername() : ("User #" + s.getUserId()))
                    .vipPlanId(s.getVipPlanId())
                    .planCode(planCode)
                    .planName(planName)
                    .status(s.getStatus())
                    .startAt(s.getStartAt())
                    .endAt(s.getEndAt())
                    .daysRemaining(daysLeft)
                    .createdAt(s.getCreatedAt())
                    .build());
        }

        return responseList;
    }

    /**
     * Cập nhật trạng thái đăng ký VIP (ACTIVE, CANCELLED, EXPIRED...)
     */
    @Transactional
    public UserSubscription updateSubscriptionStatus(Long id, String status) {
        UserSubscription sub = userSubscriptionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lượt đăng ký ID: " + id));

        String upper = status.trim().toUpperCase();
        sub.setStatus(upper);

        if ("ACTIVE".equals(upper)) {
            if (sub.getStartAt() == null) {
                sub.setStartAt(OffsetDateTime.now());
            }
            if (sub.getEndAt() == null || sub.getEndAt().isBefore(OffsetDateTime.now())) {
                VipPlan plan = sub.getVipPlan();
                int days = (plan != null && plan.getDurationDays() != null) ? plan.getDurationDays() : 30;
                sub.setEndAt(OffsetDateTime.now().plusDays(days));
            }
        }

        return userSubscriptionRepository.save(sub);
    }

    /**
     * Cấp quyền VIP thủ công cho người dùng
     */
    @Transactional
    public UserSubscription manualGrantSubscription(VipPlanDto.ManualGrantRequest request) {
        VipPlan plan = vipPlanRepository.findById(request.vipPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy gói VIP ID: " + request.vipPlanId()));

        int duration = (request.customDurationDays() != null && request.customDurationDays() > 0)
                ? request.customDurationDays()
                : plan.getDurationDays();

        OffsetDateTime start = OffsetDateTime.now();
        OffsetDateTime end = start.plusDays(duration);

        UserSubscription sub = UserSubscription.builder()
                .userId(request.userId())
                .vipPlanId(plan.getId())
                .status("ACTIVE")
                .startAt(start)
                .endAt(end)
                .build();

        return userSubscriptionRepository.save(sub);
    }

    /**
     * Lấy danh sách giao dịch thanh toán VIP
     */
    @Transactional(readOnly = true)
    public List<PaymentTransaction> getAllPaymentTransactions() {
        return paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Thống kê tổng quan về VIP
     */
    @Transactional(readOnly = true)
    public VipPlanDto.OverviewStats getOverviewStats() {
        long totalPlans = vipPlanRepository.count();
        long activePlans = vipPlanRepository.findAll().stream().filter(p -> Boolean.TRUE.equals(p.getIsActive())).count();
        long activeSubs = userSubscriptionRepository.countByStatus("ACTIVE");
        long pendingSubs = userSubscriptionRepository.countByStatus("PENDING");

        List<PaymentTransaction> payments = paymentTransactionRepository.findAll();
        BigDecimal totalRevenue = payments.stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()) && p.getAmount() != null)
                .map(PaymentTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return VipPlanDto.OverviewStats.builder()
                .totalPlans(totalPlans)
                .activePlans(activePlans)
                .activeSubscriptions(activeSubs)
                .pendingSubscriptions(pendingSubs)
                .totalRevenue(totalRevenue)
                .totalTransactions(payments.size())
                .build();
    }
}

