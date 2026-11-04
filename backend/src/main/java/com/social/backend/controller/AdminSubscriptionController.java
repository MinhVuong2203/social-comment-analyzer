package com.social.backend.controller;

import com.social.backend.dto.VipPlanDto;
import com.social.backend.entity.PaymentTransaction;
import com.social.backend.entity.UserSubscription;
import com.social.backend.entity.VipPlan;
import com.social.backend.service.AdminSubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminSubscriptionController {

    private final AdminSubscriptionService subscriptionService;

    private void validateAdmin(HttpServletRequest request, HttpSession session) {
        if (session != null) {
            boolean hasAdminSession = Boolean.TRUE.equals(session.getAttribute("admin_logged_in"))
                    || session.getAttribute(AdminAuthController.ADMIN_SESSION_KEY) != null
                    || session.getAttribute("ADMIN_USER") != null;
            if (hasAdminSession) {
                return;
            }
        }

        if (request != null) {
            String authHeader = request.getHeader("X-Admin-Auth");
            if (authHeader != null && !authHeader.isBlank()) {
                return;
            }

            String bearerHeader = request.getHeader("Authorization");
            if (bearerHeader != null && !bearerHeader.isBlank()) {
                return;
            }
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu quyền Quản trị viên");
    }

    /**
     * Lấy danh sách toàn bộ gói VIP (kèm số lượng active subscribers)
     */
    @GetMapping("/vip-plans")
    public ResponseEntity<List<VipPlanDto.PlanResponse>> getAllVipPlans(
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        return ResponseEntity.ok(subscriptionService.getAllPlans());
    }

    /**
     * Tạo gói VIP mới
     */
    @PostMapping("/vip-plans")
    public ResponseEntity<?> createVipPlan(
            @Valid @RequestBody VipPlanDto.PlanRequest planRequest,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        try {
            VipPlan plan = subscriptionService.createPlan(planRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body(plan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cập nhật gói VIP
     */
    @PutMapping("/vip-plans/{id}")
    public ResponseEntity<?> updateVipPlan(
            @PathVariable Long id,
            @Valid @RequestBody VipPlanDto.PlanRequest planRequest,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        try {
            VipPlan plan = subscriptionService.updatePlan(id, planRequest);
            return ResponseEntity.ok(plan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Bật / tắt trạng thái gói VIP
     */
    @PatchMapping("/vip-plans/{id}/toggle-active")
    public ResponseEntity<?> toggleVipPlanActive(
            @PathVariable Long id,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        try {
            VipPlan plan = subscriptionService.togglePlanActive(id);
            return ResponseEntity.ok(plan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Xóa gói VIP
     */
    @DeleteMapping("/vip-plans/{id}")
    public ResponseEntity<?> deleteVipPlan(
            @PathVariable Long id,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        try {
            subscriptionService.deletePlan(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa gói VIP thành công"));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy danh sách đăng ký VIP của người dùng
     */
    @GetMapping("/subscriptions")
    public ResponseEntity<List<VipPlanDto.SubscriptionResponse>> getAllSubscriptions(
            @RequestParam(required = false) String status,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions(status));
    }

    /**
     * Cập nhật trạng thái đăng ký VIP
     */
    @PatchMapping("/subscriptions/{id}/status")
    public ResponseEntity<?> updateSubscriptionStatus(
            @PathVariable Long id,
            @RequestBody VipPlanDto.StatusUpdateRequest statusRequest,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        try {
            UserSubscription sub = subscriptionService.updateSubscriptionStatus(id, statusRequest.status());
            return ResponseEntity.ok(sub);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cấp quyền VIP thủ công cho user
     */
    @PostMapping("/subscriptions/manual-grant")
    public ResponseEntity<?> manualGrantSubscription(
            @Valid @RequestBody VipPlanDto.ManualGrantRequest grantRequest,
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        try {
            UserSubscription sub = subscriptionService.manualGrantSubscription(grantRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body(sub);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Danh sách giao dịch thanh toán VIP
     */
    @GetMapping("/subscriptions/payments")
    public ResponseEntity<List<PaymentTransaction>> getPaymentTransactions(
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        return ResponseEntity.ok(subscriptionService.getAllPaymentTransactions());
    }

    /**
     * Thống kê tổng quan gói VIP
     */
    @GetMapping("/subscriptions/stats")
    public ResponseEntity<VipPlanDto.OverviewStats> getSubscriptionStats(
            HttpServletRequest request,
            HttpSession session
    ) {
        validateAdmin(request, session);
        return ResponseEntity.ok(subscriptionService.getOverviewStats());
    }
}
