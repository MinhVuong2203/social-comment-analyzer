package com.social.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import com.social.backend.dto.PaymentDto;
import com.social.backend.entity.PaymentTransaction;
import com.social.backend.entity.User;
import com.social.backend.entity.UserSubscription;
import com.social.backend.entity.VipPlan;
import com.social.backend.repository.PaymentTransactionRepository;
import com.social.backend.repository.UserRepository;
import com.social.backend.repository.UserSubscriptionRepository;
import com.social.backend.repository.VipPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - PaymentService")
class PaymentServiceTest {

    @Mock
    private PayOSService payOSService;

    @Mock
    private VipPlanRepository vipPlanRepository;

    @Mock
    private UserSubscriptionRepository userSubscriptionRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private PaymentService paymentService;

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    private User testUser;
    private VipPlan testPlan;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "frontendUrl", "http://localhost:5173");

        testUser = User.builder()
                .id(1L)
                .threadsUserId("threads_user_123")
                .username("testvipuser")
                .name("VIP User")
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .build();

        testPlan = VipPlan.builder()
                .id(1L)
                .planCode("VIP_30_DAYS")
                .planName("VIP 30 ngày")
                .description("Sử dụng VIP 30 ngày")
                .price(new BigDecimal("99000"))
                .durationDays(30)
                .isActive(true)
                .build();
    }

    @Nested
    @DisplayName("Tạo đơn hàng thanh toán (createPayment)")
    class CreatePaymentTests {

        @Test
        @DisplayName("TC-SRV-001: Ném IllegalArgumentException khi request thiếu vipPlanId")
        void shouldThrowExceptionWhenVipPlanIdIsNull() {
            PaymentDto.CreatePaymentRequest request = new PaymentDto.CreatePaymentRequest(null, null, null);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    paymentService.createPayment(testUser, request)
            );
            assertEquals("Vui lòng chọn gói VIP cần mua.", ex.getMessage());
        }

        @Test
        @DisplayName("TC-SRV-002: Ném IllegalArgumentException khi gói VIP không tồn tại trong hệ thống")
        void shouldThrowExceptionWhenVipPlanNotFound() {
            PaymentDto.CreatePaymentRequest request = new PaymentDto.CreatePaymentRequest(999L, null, null);
            when(vipPlanRepository.findById(999L)).thenReturn(Optional.empty());

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    paymentService.createPayment(testUser, request)
            );
            assertTrue(ex.getMessage().contains("Không tìm thấy gói VIP ID: 999"));
        }

        @Test
        @DisplayName("TC-SRV-003: Ném IllegalStateException khi gói VIP đang tạm dừng mở bán (isActive=false)")
        void shouldThrowExceptionWhenVipPlanIsInactive() {
            testPlan.setIsActive(false);
            when(vipPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));

            PaymentDto.CreatePaymentRequest request = new PaymentDto.CreatePaymentRequest(1L, null, null);

            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    paymentService.createPayment(testUser, request)
            );
            assertEquals("Gói VIP này hiện đang tạm dừng mở bán.", ex.getMessage());
        }

        @Test
        @DisplayName("TC-SRV-004: Ném IllegalStateException khi người dùng đang có gói VIP còn hạn")
        void shouldThrowExceptionWhenUserAlreadyHasActiveVip() {
            when(vipPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));

            UserSubscription activeSub = UserSubscription.builder()
                    .id(10L)
                    .userId(testUser.getId())
                    .vipPlanId(1L)
                    .status("ACTIVE")
                    .endAt(OffsetDateTime.now().plusDays(15))
                    .build();

            when(userSubscriptionRepository.findFirstByUserIdAndStatusOrderByEndAtDesc(anyLong(), eq("ACTIVE")))
                    .thenReturn(Optional.of(activeSub));

            PaymentDto.CreatePaymentRequest request = new PaymentDto.CreatePaymentRequest(1L, null, null);

            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    paymentService.createPayment(testUser, request)
            );
            assertTrue(ex.getMessage().contains("Bạn đang có gói VIP còn hiệu lực"));
        }

        @Test
        @DisplayName("TC-SRV-005: Tạo thành công đơn hàng thanh toán qua cổng PayOS khi đã cấu hình")
        void shouldCreatePaymentSuccessfullyWithConfiguredPayOS() throws Exception {
            when(vipPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));
            when(userSubscriptionRepository.findFirstByUserIdAndStatusOrderByEndAtDesc(anyLong(), eq("ACTIVE")))
                    .thenReturn(Optional.empty());

            when(userSubscriptionRepository.save(any(UserSubscription.class))).thenAnswer(invocation -> {
                UserSubscription sub = invocation.getArgument(0);
                sub.setId(101L);
                return sub;
            });

            when(payOSService.isConfigured()).thenReturn(true);

            String payosResponseJson = """
                {
                    "checkoutUrl": "https://pay.payos.vn/web/test123",
                    "qrCode": "vietqr_code_sample",
                    "paymentLinkId": "plink_12345",
                    "accountNumber": "123456789",
                    "accountName": "NGUYEN VAN A",
                    "bin": "970422"
                }
            """;
            JsonNode payosData = jsonMapper.readTree(payosResponseJson);
            when(payOSService.createPaymentLink(anyLong(), any(BigDecimal.class), anyString(), anyString(), anyString()))
                    .thenReturn(payosData);

            PaymentDto.CreatePaymentRequest request = new PaymentDto.CreatePaymentRequest(1L, null, null);
            PaymentDto.CreatePaymentResponse response = paymentService.createPayment(testUser, request);

            assertNotNull(response);
            assertEquals("https://pay.payos.vn/web/test123", response.checkoutUrl());
            assertEquals("vietqr_code_sample", response.qrCode());
            assertEquals("plink_12345", response.paymentLinkId());
            assertEquals("PENDING", response.status());
            assertEquals(new BigDecimal("99000"), response.amount());

            verify(paymentTransactionRepository, atLeastOnce()).save(any(PaymentTransaction.class));
            verify(userSubscriptionRepository, times(1)).save(any(UserSubscription.class));
        }

        @Test
        @DisplayName("TC-SRV-006: Tạo thanh toán ở chế độ Mock checkout khi PayOS chưa cấu hình key")
        void shouldCreateMockPaymentWhenPayOSNotConfigured() {
            when(vipPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));
            when(userSubscriptionRepository.findFirstByUserIdAndStatusOrderByEndAtDesc(anyLong(), eq("ACTIVE")))
                    .thenReturn(Optional.empty());

            when(userSubscriptionRepository.save(any(UserSubscription.class))).thenAnswer(invocation -> {
                UserSubscription sub = invocation.getArgument(0);
                sub.setId(102L);
                return sub;
            });

            when(payOSService.isConfigured()).thenReturn(false);

            PaymentDto.CreatePaymentRequest request = new PaymentDto.CreatePaymentRequest(1L, null, null);
            PaymentDto.CreatePaymentResponse response = paymentService.createPayment(testUser, request);

            assertNotNull(response);
            assertTrue(response.checkoutUrl().contains("/mock/"));
            assertEquals("PENDING_CONFIG", response.status());
        }
    }

    @Nested
    @DisplayName("Xử lý Webhook PayOS (handlePayOSWebhook)")
    class WebhookTests {

        @Test
        @DisplayName("TC-SRV-007: Trả về true an toàn khi payload null hoặc thiếu data")
        void shouldHandleEmptyOrNullWebhookPayload() {
            assertTrue(paymentService.handlePayOSWebhook(null));
            assertTrue(paymentService.handlePayOSWebhook(jsonMapper.createObjectNode()));
        }

        @Test
        @DisplayName("TC-SRV-008: Bỏ qua kiểm tra chữ ký và trả về true cho gói test orderCode=123")
        void shouldHandleTestWebhookPayloadFromPayOSDashboard() throws Exception {
            String testWebhookJson = """
                {
                    "data": {
                        "orderCode": 123
                    }
                }
            """;
            JsonNode payload = jsonMapper.readTree(testWebhookJson);
            boolean result = paymentService.handlePayOSWebhook(payload);
            assertTrue(result);
            verify(paymentTransactionRepository, never()).findByOrderCode(anyString());
        }

        @Test
        @DisplayName("TC-SRV-009: Webhook thành công (code=00) kích hoạt thanh toán SUCCESS và kích hoạt VIP")
        void shouldActivateVipWhenWebhookIsSuccess() throws Exception {
            String webhookJson = """
                {
                    "code": "00",
                    "desc": "success",
                    "data": {
                        "orderCode": 123456789,
                        "reference": "BANK_REF_999"
                    },
                    "signature": "valid_sig"
                }
            """;
            JsonNode payload = jsonMapper.readTree(webhookJson);

            when(payOSService.isConfigured()).thenReturn(true);
            when(payOSService.verifyWebhookSignature(any(JsonNode.class), eq("valid_sig"))).thenReturn(true);

            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(50L)
                    .userId(1L)
                    .subscriptionId(200L)
                    .orderCode("123456789")
                    .status("PENDING")
                    .amount(new BigDecimal("99000"))
                    .build();

            when(paymentTransactionRepository.findByOrderCode("123456789")).thenReturn(Optional.of(tx));

            UserSubscription sub = UserSubscription.builder()
                    .id(200L)
                    .userId(1L)
                    .vipPlanId(1L)
                    .status("PENDING")
                    .build();

            when(userSubscriptionRepository.findById(200L)).thenReturn(Optional.of(sub));
            when(vipPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));

            boolean handled = paymentService.handlePayOSWebhook(payload);

            assertTrue(handled);
            assertEquals("SUCCESS", tx.getStatus());
            assertEquals("BANK_REF_999", tx.getProviderTransactionId());
            assertNotNull(tx.getPaidAt());

            assertEquals("ACTIVE", sub.getStatus());
            assertNotNull(sub.getStartAt());
            assertNotNull(sub.getEndAt());

            verify(paymentTransactionRepository).save(tx);
            verify(userSubscriptionRepository).save(sub);
        }
    }

    @Nested
    @DisplayName("Kiểm tra và đồng bộ trạng thái đơn hàng (checkAndSyncPaymentStatus)")
    class CheckPaymentStatusTests {

        @Test
        @DisplayName("TC-SRV-010: Ném IllegalArgumentException khi không tìm thấy đơn hàng theo orderCode")
        void shouldThrowExceptionWhenOrderNotFound() {
            when(paymentTransactionRepository.findByOrderCode("999999")).thenReturn(Optional.empty());

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    paymentService.checkAndSyncPaymentStatus(999999L)
            );
            assertTrue(ex.getMessage().contains("Không tìm thấy đơn hàng #999999"));
        }

        @Test
        @DisplayName("TC-SRV-011: Trả về trạng thái SUCCESS ngay lập tức nếu đơn hàng đã thành công trước đó")
        void shouldReturnSuccessWhenAlreadyPaid() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(1L)
                    .orderCode("1001")
                    .status("SUCCESS")
                    .amount(new BigDecimal("99000"))
                    .subscriptionId(10L)
                    .paidAt(OffsetDateTime.now())
                    .build();

            when(paymentTransactionRepository.findByOrderCode("1001")).thenReturn(Optional.of(tx));

            PaymentDto.PaymentStatusResponse response = paymentService.checkAndSyncPaymentStatus(1001L);

            assertNotNull(response);
            assertEquals("SUCCESS", response.status());
            assertEquals(1001L, response.orderCode());
        }

        @Test
        @DisplayName("TC-SRV-012: Đồng bộ kích hoạt SUCCESS khi PayOS báo trạng thái PAID")
        void shouldSyncAndActivateWhenPayOSReportsPaid() throws Exception {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(2L)
                    .orderCode("1002")
                    .status("PENDING")
                    .amount(new BigDecimal("99000"))
                    .subscriptionId(20L)
                    .build();

            when(paymentTransactionRepository.findByOrderCode("1002")).thenReturn(Optional.of(tx));
            when(payOSService.isConfigured()).thenReturn(true);

            String payosInfoJson = """
                {
                    "status": "PAID",
                    "reference": "REF_1002"
                }
            """;
            JsonNode payosInfo = jsonMapper.readTree(payosInfoJson);
            when(payOSService.getPaymentLinkInformation(1002L)).thenReturn(payosInfo);

            UserSubscription sub = UserSubscription.builder()
                    .id(20L)
                    .userId(1L)
                    .vipPlanId(1L)
                    .status("PENDING")
                    .build();
            when(userSubscriptionRepository.findById(20L)).thenReturn(Optional.of(sub));
            when(vipPlanRepository.findById(1L)).thenReturn(Optional.of(testPlan));

            PaymentDto.PaymentStatusResponse response = paymentService.checkAndSyncPaymentStatus(1002L);

            assertNotNull(response);
            assertEquals("SUCCESS", response.status());
            assertEquals("SUCCESS", tx.getStatus());
        }
    }

    @Nested
    @DisplayName("Hủy giao dịch thanh toán (cancelPayment)")
    class CancelPaymentTests {

        @Test
        @DisplayName("TC-SRV-013: Trả về false khi không thể hủy giao dịch đã thành công (SUCCESS)")
        void shouldNotCancelAlreadySuccessfulPayment() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(3L)
                    .orderCode("1003")
                    .status("SUCCESS")
                    .build();

            when(paymentTransactionRepository.findByOrderCode("1003")).thenReturn(Optional.of(tx));

            boolean cancelled = paymentService.cancelPayment(1003L, "User changed mind");
            assertFalse(cancelled);
            assertEquals("SUCCESS", tx.getStatus());
        }

        @Test
        @DisplayName("TC-SRV-014: Hủy thành công giao dịch PENDING và cập nhật subscription thành CANCELLED")
        void shouldCancelPendingPayment() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(4L)
                    .orderCode("1004")
                    .status("PENDING")
                    .subscriptionId(40L)
                    .build();

            when(paymentTransactionRepository.findByOrderCode("1004")).thenReturn(Optional.of(tx));

            UserSubscription sub = UserSubscription.builder()
                    .id(40L)
                    .status("PENDING")
                    .build();
            when(userSubscriptionRepository.findById(40L)).thenReturn(Optional.of(sub));

            boolean cancelled = paymentService.cancelPayment(1004L, "User cancelled");

            assertTrue(cancelled);
            assertEquals("CANCELLED", tx.getStatus());
            assertEquals("CANCELLED", sub.getStatus());

            verify(paymentTransactionRepository).save(tx);
            verify(userSubscriptionRepository).save(sub);
        }
    }

    @Nested
    @DisplayName("Lấy hồ sơ cá nhân và gói VIP (getUserProfile)")
    class GetUserProfileTests {

        @Test
        @DisplayName("TC-SRV-015: Trả về isVip=false và danh sách gói khi người dùng chưa có VIP")
        void shouldReturnProfileWithNoVip() {
            when(userSubscriptionRepository.findFirstByUserIdAndStatusOrderByEndAtDesc(anyLong(), eq("ACTIVE")))
                    .thenReturn(Optional.empty());
            when(vipPlanRepository.findByIsActiveTrueOrderByPriceAsc()).thenReturn(List.of(testPlan));
            when(paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(Collections.emptyList());

            PaymentDto.UserProfileResponse profile = paymentService.getUserProfile(testUser);

            assertNotNull(profile);
            assertFalse(profile.isVip());
            assertNull(profile.activeSubscription());
            assertEquals(1, profile.availablePlans().size());
            assertEquals("VIP_30_DAYS", profile.availablePlans().get(0).planCode());
        }

        @Test
        @DisplayName("TC-SRV-016: Trả về isVip=true và thông tin activeSubscription khi người dùng có VIP còn hạn")
        void shouldReturnProfileWithActiveVip() {
            UserSubscription activeSub = UserSubscription.builder()
                    .id(50L)
                    .userId(testUser.getId())
                    .vipPlanId(1L)
                    .vipPlan(testPlan)
                    .status("ACTIVE")
                    .startAt(OffsetDateTime.now().minusDays(5))
                    .endAt(OffsetDateTime.now().plusDays(25))
                    .build();

            when(userSubscriptionRepository.findFirstByUserIdAndStatusOrderByEndAtDesc(anyLong(), eq("ACTIVE")))
                    .thenReturn(Optional.of(activeSub));
            when(vipPlanRepository.findByIsActiveTrueOrderByPriceAsc()).thenReturn(List.of(testPlan));
            when(paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(Collections.emptyList());

            PaymentDto.UserProfileResponse profile = paymentService.getUserProfile(testUser);

            assertNotNull(profile);
            assertTrue(profile.isVip());
            assertNotNull(profile.activeSubscription());
            assertEquals("VIP 30 ngày", profile.activeSubscription().planName());
            assertTrue(profile.activeSubscription().daysRemaining() >= 24);
        }
    }
}
