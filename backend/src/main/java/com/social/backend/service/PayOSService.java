package com.social.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@Slf4j
public class PayOSService {

    private static final String PAYOS_API_BASE = "https://api-merchant.payos.vn";

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    @Value("${payos.webhook-url:}")
    private String webhookUrl;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public PayOSService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.baseUrl(PAYOS_API_BASE).build();
        this.objectMapper = JsonMapper.builder().build();
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && checksumKey != null && !checksumKey.isBlank();
    }

    /**
     * Tạo link thanh toán VietQR qua PayOS API v2
     */
    public JsonNode createPaymentLink(
            Long orderCode,
            BigDecimal amount,
            String description,
            String returnUrl,
            String cancelUrl
    ) {
        if (!isConfigured()) {
            throw new IllegalStateException("Cổng PayOS chưa được cấu hình. Vui lòng điền Client ID, Api Key, Checksum Key trong application.properties");
        }

        // PayOS quy định mô tả tối đa 25 ký tự không dấu hoặc ngắn gọn
        String cleanDesc = cleanDescription(description);

        // Quy tắc ký PayOS: amount, cancelUrl, description, orderCode, returnUrl theo alphabet
        long amountLong = amount.longValue();
        String dataToSign = String.format(
                "amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amountLong,
                cancelUrl,
                cleanDesc,
                orderCode,
                returnUrl
        );

        String signature = hmacSha256(dataToSign, checksumKey.trim());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", amountLong);
        body.put("description", cleanDesc);
        body.put("cancelUrl", cancelUrl);
        body.put("returnUrl", returnUrl);
        body.put("signature", signature);

        log.info("Gửi yêu cầu tạo PayOS payment link: orderCode={}, amount={}", orderCode, amountLong);

        try {
            String response = restClient.post()
                    .uri("/v2/payment-requests")
                    .header("x-client-id", clientId.trim())
                    .header("x-api-key", apiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            String code = root.has("code") ? root.get("code").asText() : "";
            if (!"00".equals(code)) {
                String desc = root.has("desc") ? root.get("desc").asText() : "Lỗi không xác định";
                throw new RuntimeException("PayOS trả về lỗi: " + desc + " (mã: " + code + ")");
            }

            return root.get("data");
        } catch (Exception e) {
            log.error("Lỗi khi gọi PayOS createPaymentLink: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể tạo link thanh toán PayOS: " + e.getMessage(), e);
        }
    }

    /**
     * Lấy thông tin & trạng thái thanh toán từ PayOS
     * GET /v2/payment-requests/{orderCode}
     */
    public JsonNode getPaymentLinkInformation(Long orderCode) {
        if (!isConfigured()) {
            return null;
        }

        try {
            String response = restClient.get()
                    .uri("/v2/payment-requests/{orderCode}", orderCode)
                    .header("x-client-id", clientId.trim())
                    .header("x-api-key", apiKey.trim())
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            if (root != null && root.has("data")) {
                return root.get("data");
            }
        } catch (Exception e) {
            log.warn("Không thể kiểm tra trạng thái đơn PayOS #{}: {}", orderCode, e.getMessage());
        }
        return null;
    }

    /**
     * Hủy link thanh toán PayOS
     * POST /v2/payment-requests/{orderCode}/cancel
     */
    public boolean cancelPaymentLink(Long orderCode, String cancellationReason) {
        if (!isConfigured()) {
            return false;
        }

        try {
            Map<String, String> body = Map.of(
                    "cancellationReason",
                    cancellationReason != null ? cancellationReason : "User cancelled"
            );

            restClient.post()
                    .uri("/v2/payment-requests/{orderCode}/cancel", orderCode)
                    .header("x-client-id", clientId.trim())
                    .header("x-api-key", apiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Đã hủy link thanh toán PayOS orderCode={}", orderCode);
            return true;
        } catch (Exception e) {
            log.warn("Không thể hủy link thanh toán PayOS #{}: {}", orderCode, e.getMessage());
            return false;
        }
    }

    /**
     * Xác thực chữ ký webhook từ PayOS
     */
    public boolean verifyWebhookSignature(JsonNode dataNode, String receivedSignature) {
        if (!isConfigured() || dataNode == null || receivedSignature == null) {
            return false;
        }

        try {
            // Sắp xếp các key trong dataNode theo alphabet
            List<String> fieldNames = new ArrayList<>();
            dataNode.propertyNames().forEach(fieldNames::add);
            Collections.sort(fieldNames);

            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < fieldNames.size(); i++) {
                String key = fieldNames.get(i);
                JsonNode valueNode = dataNode.get(key);
                String valueStr = valueNode.isNull() ? "" : valueNode.asText();
                if (i > 0) sb.append("&");
                sb.append(key).append("=").append(valueStr);
            }

            String calculatedSig = hmacSha256(sb.toString(), checksumKey.trim());
            return calculatedSig.equalsIgnoreCase(receivedSignature.trim());
        } catch (Exception e) {
            log.error("Lỗi khi xác thực chữ ký PayOS webhook: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Thuật toán HMAC-SHA256 chuẩn
     */
    public static String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 calculation failed: " + e.getMessage(), e);
        }
    }

    private String cleanDescription(String desc) {
        if (desc == null || desc.isBlank()) return "Thanh toan VIP";
        // Bỏ dấu tiếng Việt đơn giản cho description nếu cần
        String normalized = java.text.Normalizer.normalize(desc, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-zA-Z0-9 ]", "")
                .trim();
        if (normalized.length() > 25) {
            return normalized.substring(0, 25).trim();
        }
        return normalized.isEmpty() ? "Thanh toan VIP" : normalized;
    }
}
