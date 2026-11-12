package com.social.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Unit Tests - PayOSService")
class PayOSServiceTest {

    private PayOSService payOSService;
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        payOSService = new PayOSService(RestClient.builder());
        ReflectionTestUtils.setField(payOSService, "clientId", "test-client-id-123");
        ReflectionTestUtils.setField(payOSService, "apiKey", "test-api-key-456");
        ReflectionTestUtils.setField(payOSService, "checksumKey", "test-checksum-key-789");
    }

    @Nested
    @DisplayName("Cấu hình PayOS (isConfigured)")
    class ConfigurationTests {

        @Test
        @DisplayName("TC-PAYOS-001: isConfigured trả về true khi có đầy đủ clientId, apiKey, checksumKey")
        void shouldReturnTrueWhenAllKeysConfigured() {
            assertTrue(payOSService.isConfigured());
        }

        @Test
        @DisplayName("TC-PAYOS-002: isConfigured trả về false khi thiếu một trong các key")
        void shouldReturnFalseWhenAnyKeyIsMissing() {
            ReflectionTestUtils.setField(payOSService, "clientId", "");
            assertFalse(payOSService.isConfigured());

            ReflectionTestUtils.setField(payOSService, "clientId", "test-id");
            ReflectionTestUtils.setField(payOSService, "apiKey", null);
            assertFalse(payOSService.isConfigured());

            ReflectionTestUtils.setField(payOSService, "apiKey", "test-key");
            ReflectionTestUtils.setField(payOSService, "checksumKey", "   ");
            assertFalse(payOSService.isConfigured());
        }
    }

    @Nested
    @DisplayName("HMAC-SHA256 & Tính chữ ký thanh toán")
    class HmacSignatureTests {

        @Test
        @DisplayName("TC-PAYOS-003: Thuật toán hmacSha256 tính mã băm hex chính xác")
        void shouldCalculateCorrectHmacSha256() {
            String data = "amount=99000&cancelUrl=http://localhost:5173/cancel&description=VIP 30 ngay&orderCode=123456&returnUrl=http://localhost:5173/success";
            String key = "test-checksum-key-789";

            String hash1 = PayOSService.hmacSha256(data, key);
            String hash2 = PayOSService.hmacSha256(data, key);

            assertNotNull(hash1);
            assertEquals(64, hash1.length(), "HMAC-SHA256 phải là chuỗi hex 64 ký tự");
            assertEquals(hash1, hash2, "Cùng input và key thì chữ ký phải giống nhau");
        }

        @Test
        @DisplayName("TC-PAYOS-004: createPaymentLink ném ngoại lệ khi chưa cấu hình key")
        void shouldThrowExceptionWhenNotConfigured() {
            ReflectionTestUtils.setField(payOSService, "clientId", null);

            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    payOSService.createPaymentLink(123456L, new BigDecimal("99000"), "VIP 30 ngay", "http://return", "http://cancel")
            );
            assertTrue(ex.getMessage().contains("chưa được cấu hình"));
        }
    }

    @Nested
    @DisplayName("Xác thực Webhook Signature (verifyWebhookSignature)")
    class WebhookSignatureTests {

        @Test
        @DisplayName("TC-PAYOS-005: Chữ ký webhook hợp lệ khi các trường primitive được sắp xếp alphabet và khớp HMAC")
        void shouldVerifyValidWebhookSignature() throws Exception {
            String checksumKey = "test-checksum-key-789";

            // Sắp xếp alphabet: amount, description, orderCode, reference
            String dataString = "amount=99000&description=VIP 30 ngay&orderCode=123456&reference=FT12345678";
            String expectedSig = PayOSService.hmacSha256(dataString, checksumKey);

            String jsonPayload = """
                {
                    "orderCode": 123456,
                    "amount": 99000,
                    "description": "VIP 30 ngay",
                    "reference": "FT12345678"
                }
            """;
            JsonNode dataNode = jsonMapper.readTree(jsonPayload);

            boolean isValid = payOSService.verifyWebhookSignature(dataNode, expectedSig);
            assertTrue(isValid, "Chữ ký webhook phải được xác nhận hợp lệ");
        }

        @Test
        @DisplayName("TC-PAYOS-006: verifyWebhookSignature trả về false khi chữ ký bị sai lệch hoặc giả mạo")
        void shouldRejectInvalidWebhookSignature() throws Exception {
            String jsonPayload = """
                {
                    "orderCode": 123456,
                    "amount": 99000,
                    "description": "VIP 30 ngay"
                }
            """;
            JsonNode dataNode = jsonMapper.readTree(jsonPayload);

            boolean isValid = payOSService.verifyWebhookSignature(dataNode, "fake_signature_1234567890abcdef");
            assertFalse(isValid, "Chữ ký sai lệch phải bị từ chối");
        }

        @Test
        @DisplayName("TC-PAYOS-007: verifyWebhookSignature an toàn khi dataNode hoặc signature null")
        void shouldHandleNullDataOrSignatureSafely() {
            assertFalse(payOSService.verifyWebhookSignature(null, "some_sig"));
            assertFalse(payOSService.verifyWebhookSignature(jsonMapper.createObjectNode(), null));
            assertFalse(payOSService.verifyWebhookSignature(jsonMapper.createObjectNode(), ""));
        }
    }
}
