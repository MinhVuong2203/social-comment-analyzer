package com.social.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.social.backend.dto.PaymentDto;
import com.social.backend.entity.User;
import com.social.backend.repository.UserRepository;
import com.social.backend.service.PaymentService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    /**
     * Helper lấy thông tin người dùng từ Session
     */
    private User getAuthenticatedUser(HttpSession session) {
        if (session != null) {
            Object threadsUserId = session.getAttribute("threads_user_id");
            if (threadsUserId != null) {
                Optional<User> uOpt = userRepository.findByThreadsUserId(threadsUserId.toString());
                if (uOpt.isPresent()) {
                    return uOpt.get();
                }
            }
        }

        // Hỗ trợ môi trường demo / dev nếu chưa kết nối Threads OAuth
        return userRepository.findAll().stream().findFirst().orElseGet(() -> {
            User demoUser = User.builder()
                    .threadsUserId("demo_user_1")
                    .username("demo_user")
                    .name("Người Dùng Thử")
                    .role(User.Role.USER)
                    .status(User.UserStatus.ACTIVE)
                    .build();
            return userRepository.save(demoUser);
        });
    }

    /**
     * Lấy thông tin cá nhân của người dùng, gói VIP hiện tại và danh sách gói mở bán
     * GET /api/user/profile
     */
    @GetMapping("/user/profile")
    public ResponseEntity<PaymentDto.UserProfileResponse> getUserProfile(HttpSession session) {
        User user = getAuthenticatedUser(session);
        return ResponseEntity.ok(paymentService.getUserProfile(user));
    }

    /**
     * Tạo yêu cầu thanh toán mua gói VIP qua PayOS
     * POST /api/payments/payos/create
     */
    @PostMapping("/payments/payos/create")
    public ResponseEntity<?> createPayment(
            @RequestBody PaymentDto.CreatePaymentRequest request,
            HttpSession session
    ) {
        try {
            User user = getAuthenticatedUser(session);
            PaymentDto.CreatePaymentResponse response = paymentService.createPayment(user, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Lỗi khi tạo thanh toán PayOS: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi tạo thanh toán: " + e.getMessage()));
        }
    }

    /**
     * Webhook nhận thông báo kết quả thanh toán từ PayOS
     * POST /api/payments/payos/webhook
     */
    @PostMapping("/payments/payos/webhook")
    public ResponseEntity<Map<String, Object>> handlePayOSWebhook(@RequestBody JsonNode webhookPayload) {
        try {
            boolean success = paymentService.handlePayOSWebhook(webhookPayload);
            return ResponseEntity.ok(Map.of("success", success));
        } catch (Exception e) {
            log.error("Lỗi xử lý PayOS webhook: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Kiểm tra trạng thái đơn hàng & tự động kích hoạt nếu PayOS đã ghi nhận thanh toán
     * GET /api/payments/payos/check/{orderCode}
     */
    @GetMapping("/payments/payos/check/{orderCode}")
    public ResponseEntity<PaymentDto.PaymentStatusResponse> checkPaymentStatus(@PathVariable Long orderCode) {
        try {
            return ResponseEntity.ok(paymentService.checkAndSyncPaymentStatus(orderCode));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    /**
     * Hủy đơn hàng thanh toán
     * POST /api/payments/payos/cancel/{orderCode}
     */
    @PostMapping("/payments/payos/cancel/{orderCode}")
    public ResponseEntity<Map<String, Object>> cancelPayment(
            @PathVariable Long orderCode,
            @RequestParam(required = false) String reason
    ) {
        boolean cancelled = paymentService.cancelPayment(orderCode, reason);
        return ResponseEntity.ok(Map.of("success", cancelled, "orderCode", orderCode));
    }
}

