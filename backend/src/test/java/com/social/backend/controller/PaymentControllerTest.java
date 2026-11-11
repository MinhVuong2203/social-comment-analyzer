package com.social.backend.controller;

import com.social.backend.dto.PaymentDto;
import com.social.backend.entity.User;
import com.social.backend.repository.UserRepository;
import com.social.backend.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - PaymentController (API Payment via PayOS)")
class PaymentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PaymentService paymentService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PaymentController paymentController;

    private User testUser;
    private MockHttpSession session;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(paymentController).build();

        testUser = User.builder()
                .id(1L)
                .threadsUserId("threads_user_123")
                .username("testvipuser")
                .name("VIP User")
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .build();

        session = new MockHttpSession();
        session.setAttribute("threads_user_id", "threads_user_123");

        lenient().when(userRepository.findByThreadsUserId("threads_user_123")).thenReturn(Optional.of(testUser));
    }

    @Nested
    @DisplayName("GET /api/user/profile - Lấy thông tin tài khoản và gói VIP")
    class GetUserProfileApiTests {

        @Test
        @DisplayName("TC-API-001: Lấy profile thành công khi chưa có gói VIP -> HTTP 200")
        void shouldReturnUserProfileWithoutVip() throws Exception {
            PaymentDto.UserProfileResponse responseDto = PaymentDto.UserProfileResponse.builder()
                    .id(1L)
                    .threadsUserId("threads_user_123")
                    .username("testvipuser")
                    .name("VIP User")
                    .role("USER")
                    .status("ACTIVE")
                    .isVip(false)
                    .activeSubscription(null)
                    .availablePlans(List.of(
                            PaymentDto.VipPlanDetail.builder()
                                    .id(1L)
                                    .planCode("VIP_30_DAYS")
                                    .planName("VIP 30 ngày")
                                    .price(new BigDecimal("99000"))
                                    .durationDays(30)
                                    .isActive(true)
                                    .build()
                    ))
                    .paymentHistory(List.of())
                    .build();

            when(paymentService.getUserProfile(any(User.class))).thenReturn(responseDto);

            mockMvc.perform(get("/api/user/profile").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.isVip").value(false))
                    .andExpect(jsonPath("$.username").value("testvipuser"))
                    .andExpect(jsonPath("$.availablePlans[0].planCode").value("VIP_30_DAYS"));
        }

        @Test
        @DisplayName("TC-API-002: Lấy profile thành công khi đang sở hữu gói VIP -> HTTP 200")
        void shouldReturnUserProfileWithActiveVip() throws Exception {
            PaymentDto.VipSubscriptionDetail subDetail = PaymentDto.VipSubscriptionDetail.builder()
                    .id(10L)
                    .planCode("VIP_30_DAYS")
                    .planName("VIP 30 ngày")
                    .status("ACTIVE")
                    .daysRemaining(25L)
                    .build();

            PaymentDto.UserProfileResponse responseDto = PaymentDto.UserProfileResponse.builder()
                    .id(1L)
                    .username("testvipuser")
                    .isVip(true)
                    .activeSubscription(subDetail)
                    .availablePlans(List.of())
                    .paymentHistory(List.of())
                    .build();

            when(paymentService.getUserProfile(any(User.class))).thenReturn(responseDto);

            mockMvc.perform(get("/api/user/profile").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isVip").value(true))
                    .andExpect(jsonPath("$.activeSubscription.planName").value("VIP 30 ngày"))
                    .andExpect(jsonPath("$.activeSubscription.daysRemaining").value(25));
        }
    }

    @Nested
    @DisplayName("POST /api/payments/payos/create - Tạo thanh toán gói VIP")
    class CreatePaymentApiTests {

        @Test
        @DisplayName("TC-API-003: Tạo thanh toán thành công -> HTTP 200 và trả về checkoutUrl, qrCode")
        void shouldCreatePaymentSuccessfully() throws Exception {
            PaymentDto.CreatePaymentResponse createResp = PaymentDto.CreatePaymentResponse.builder()
                    .orderCode(123456789L)
                    .amount(new BigDecimal("99000"))
                    .description("VIP 30 ngay")
                    .checkoutUrl("https://pay.payos.vn/web/test12345")
                    .qrCode("vietqr_code_sample")
                    .accountNumber("123456789")
                    .accountName("CONG TY SOCIAL")
                    .bin("970422")
                    .status("PENDING")
                    .paymentLinkId("link_999")
                    .build();

            when(paymentService.createPayment(any(User.class), any(PaymentDto.CreatePaymentRequest.class)))
                    .thenReturn(createResp);

            String requestBody = """
                {
                    "vipPlanId": 1,
                    "returnUrl": "http://localhost:5173/profile?payment=success",
                    "cancelUrl": "http://localhost:5173/profile?payment=cancel"
                }
            """;

            mockMvc.perform(post("/api/payments/payos/create")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.orderCode").value(123456789))
                    .andExpect(jsonPath("$.amount").value(99000))
                    .andExpect(jsonPath("$.checkoutUrl").value("https://pay.payos.vn/web/test12345"))
                    .andExpect(jsonPath("$.qrCode").value("vietqr_code_sample"))
                    .andExpect(jsonPath("$.status").value("PENDING"));
        }

        @Test
        @DisplayName("TC-API-004: Thiếu vipPlanId hoặc gói không tồn tại -> HTTP 400 Bad Request")
        void shouldReturnBadRequestWhenVipPlanInvalid() throws Exception {
            when(paymentService.createPayment(any(User.class), any(PaymentDto.CreatePaymentRequest.class)))
                    .thenThrow(new IllegalArgumentException("Vui lòng chọn gói VIP cần mua."));

            String requestBody = "{}";

            mockMvc.perform(post("/api/payments/payos/create")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Vui lòng chọn gói VIP cần mua."));
        }

        @Test
        @DisplayName("TC-API-005: Đã có gói VIP còn hạn không thể mua thêm -> HTTP 400 Bad Request")
        void shouldReturnBadRequestWhenUserAlreadyHasActiveVip() throws Exception {
            when(paymentService.createPayment(any(User.class), any(PaymentDto.CreatePaymentRequest.class)))
                    .thenThrow(new IllegalStateException("Bạn đang có gói VIP còn hiệu lực. Vui lòng sử dụng hết thời hạn trước khi đăng ký gói mới."));

            String requestBody = """
                {
                    "vipPlanId": 1
                }
            """;

            mockMvc.perform(post("/api/payments/payos/create")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Bạn đang có gói VIP còn hiệu lực. Vui lòng sử dụng hết thời hạn trước khi đăng ký gói mới."));
        }

        @Test
        @DisplayName("TC-API-006: Lỗi kết nối PayOS -> HTTP 500 Internal Server Error")
        void shouldReturnInternalServerErrorWhenPayOSFails() throws Exception {
            when(paymentService.createPayment(any(User.class), any(PaymentDto.CreatePaymentRequest.class)))
                    .thenThrow(new RuntimeException("PayOS gateway timeout"));

            String requestBody = """
                {
                    "vipPlanId": 1
                }
            """;

            mockMvc.perform(post("/api/payments/payos/create")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.message").value("Lỗi tạo thanh toán: PayOS gateway timeout"));
        }
    }

    @Nested
    @DisplayName("Webhook /api/payments/payos/webhook")
    class WebhookApiTests {

        @Test
        @DisplayName("TC-API-007: Ping kiểm tra kết nối Webhook (GET hoặc POST rỗng) -> HTTP 200 OK")
        void shouldRespondToWebhookHealthcheck() throws Exception {
            mockMvc.perform(get("/api/payments/payos/webhook"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.error").value(0))
                    .andExpect(jsonPath("$.message").value("Webhook endpoint is active"))
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("TC-API-008: Webhook nhận thông báo thanh toán thành công -> HTTP 200 OK (success=true)")
        void shouldHandleWebhookSuccessfully() throws Exception {
            when(paymentService.handlePayOSWebhook(any())).thenReturn(true);

            String webhookJson = """
                {
                    "code": "00",
                    "desc": "success",
                    "data": {
                        "orderCode": 123456789,
                        "amount": 99000
                    },
                    "signature": "valid_signature"
                }
            """;

            mockMvc.perform(post("/api/payments/payos/webhook")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(webhookJson))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.error").value(0))
                    .andExpect(jsonPath("$.message").value("success"))
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /api/payments/payos/check/{orderCode} - Kiểm tra trạng thái đơn")
    class CheckPaymentStatusApiTests {

        @Test
        @DisplayName("TC-API-009: Kiểm tra đơn hàng thành công -> HTTP 200 OK")
        void shouldReturnPaymentStatus() throws Exception {
            PaymentDto.PaymentStatusResponse statusResponse = PaymentDto.PaymentStatusResponse.builder()
                    .orderCode(123456789L)
                    .status("SUCCESS")
                    .amount(new BigDecimal("99000"))
                    .planName("VIP 30 ngày")
                    .paidAt(OffsetDateTime.now())
                    .message("Thanh toán thành công! Gói VIP đã được kích hoạt.")
                    .build();

            when(paymentService.checkAndSyncPaymentStatus(123456789L)).thenReturn(statusResponse);

            mockMvc.perform(get("/api/payments/payos/check/123456789"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.orderCode").value(123456789))
                    .andExpect(jsonPath("$.status").value("SUCCESS"))
                    .andExpect(jsonPath("$.planName").value("VIP 30 ngày"));
        }

        @Test
        @DisplayName("TC-API-010: Kiểm tra đơn hàng không tồn tại -> HTTP 404 Not Found")
        void shouldReturnNotFoundWhenOrderDoesNotExist() throws Exception {
            when(paymentService.checkAndSyncPaymentStatus(999999L))
                    .thenThrow(new IllegalArgumentException("Không tìm thấy đơn hàng #999999"));

            mockMvc.perform(get("/api/payments/payos/check/999999"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/payments/payos/cancel/{orderCode} - Hủy đơn hàng")
    class CancelPaymentApiTests {

        @Test
        @DisplayName("TC-API-011: Hủy đơn hàng thành công -> HTTP 200 OK, success=true")
        void shouldCancelPaymentSuccessfully() throws Exception {
            when(paymentService.cancelPayment(eq(123456789L), any())).thenReturn(true);

            mockMvc.perform(post("/api/payments/payos/cancel/123456789")
                            .param("reason", "Khách hàng đổi ý"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.orderCode").value(123456789));
        }

        @Test
        @DisplayName("TC-API-012: Hủy đơn hàng không thành công (đã thanh toán hoặc không tồn tại) -> HTTP 200 OK, success=false")
        void shouldReturnFailureWhenCancelNotAllowed() throws Exception {
            when(paymentService.cancelPayment(eq(123456789L), any())).thenReturn(false);

            mockMvc.perform(post("/api/payments/payos/cancel/123456789"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.orderCode").value(123456789));
        }
    }
}
