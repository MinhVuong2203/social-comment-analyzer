package com.social.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.AiDto;
import com.social.backend.util.ExcelReportExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Unit Test cho AiServiceClient (Giao tiếp HTTP với PhoBERT AI Microservice).
 */
@ExtendWith(ExcelReportExtension.class)
@DisplayName("Unit Tests - AiServiceClient (AI Service Integration)")
class AiServiceClientTest {

    private MockRestServiceServer mockServer;
    private AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        aiServiceClient = new AiServiceClient(builder, "http://localhost:8000", "test-secret-key");
    }

    @Nested
    @DisplayName("GET /health - Kiểm tra sức khỏe dịch vụ AI")
    class HealthTests {

        @Test
        @DisplayName("TC-AI-001: health - Trả về trạng thái healthy và danh sách mô hình đã nạp")
        void shouldReturnHealthyStatus() {
            String jsonResponse = """
                {
                    "status": "healthy",
                    "device": "cpu",
                    "models": {
                        "toxicity": true,
                        "hate_speech": true,
                        "sentiment": true
                    },
                    "teencode": {
                        "total_entries": 1500
                    }
                }
            """;

            mockServer.expect(requestTo("http://localhost:8000/health"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header("X-API-Key", "test-secret-key"))
                    .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

            Map<String, Object> result = aiServiceClient.health();

            assertNotNull(result);
            assertEquals("healthy", result.get("status"));
            assertEquals("cpu", result.get("device"));
            mockServer.verify();
        }
    }

    @Nested
    @DisplayName("GET /models - Lấy danh sách tác vụ và nhãn phân loại")
    class ModelsTests {

        @Test
        @DisplayName("TC-AI-002: models - Trả về cấu hình nhãn 3 tác vụ PhoBERT")
        void shouldReturnModelsConfiguration() {
            String jsonResponse = """
                {
                    "models": [
                        {"task": "toxicity", "labels": ["NON-TOXIC", "TOXIC"]},
                        {"task": "hate_speech", "labels": ["CLEAN", "OFFENSIVE", "HATE"]},
                        {"task": "sentiment", "labels": ["NEGATIVE", "NEUTRAL", "POSITIVE"]}
                    ]
                }
            """;

            mockServer.expect(requestTo("http://localhost:8000/models"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header("X-API-Key", "test-secret-key"))
                    .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

            Map<String, Object> result = aiServiceClient.models();

            assertNotNull(result);
            assertTrue(result.containsKey("models"));
            mockServer.verify();
        }
    }

    @Nested
    @DisplayName("POST /predict - Phân tích một bình luận đơn")
    class PredictSingleTests {

        @Test
        @DisplayName("TC-AI-003: predict - Gửi text bình luận và nhận kết quả phân tích 3 tác vụ")
        void shouldPredictSingleCommentSuccessfully() throws Exception {
            AiDto.SinglePredictResponse mockResponse = new AiDto.SinglePredictResponse(
                    "Sản phẩm quá đẹp và chất lượng",
                    "sản_phẩm quá đẹp và chất_lượng",
                    new AiDto.TaskPredictionDto(0, "NON-TOXIC", 0.99, Map.of("NON-TOXIC", 0.99, "TOXIC", 0.01)),
                    new AiDto.TaskPredictionDto(0, "CLEAN", 0.98, Map.of("CLEAN", 0.98, "OFFENSIVE", 0.01, "HATE", 0.01)),
                    new AiDto.TaskPredictionDto(2, "POSITIVE", 0.99, Map.of("POSITIVE", 0.99, "NEGATIVE", 0.01))
            );

            mockServer.expect(requestTo("http://localhost:8000/predict"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE))
                    .andExpect(header("X-API-Key", "test-secret-key"))
                    .andExpect(content().json("{\"text\":\"Sản phẩm quá đẹp và chất lượng\"}"))
                    .andRespond(withSuccess(objectMapper.writeValueAsString(mockResponse), MediaType.APPLICATION_JSON));

            AiDto.SinglePredictResponse response = aiServiceClient.predict("Sản phẩm quá đẹp và chất lượng");

            assertNotNull(response);
            assertEquals("Sản phẩm quá đẹp và chất lượng", response.text());
            assertEquals("NON-TOXIC", response.toxicity().label());
            assertEquals(0.99, response.toxicity().confidence());
            assertEquals("CLEAN", response.hate_speech().label());
            assertEquals("POSITIVE", response.sentiment().label());
            mockServer.verify();
        }
    }

    @Nested
    @DisplayName("POST /predict/batch - Phân tích danh sách bình luận theo lô")
    class PredictBatchTests {

        @Test
        @DisplayName("TC-AI-004: predictBatch - Gửi danh sách batch comments và nhận kết quả phân tích")
        void shouldPredictBatchCommentsSuccessfully() throws Exception {
            List<AiDto.BatchCommentDto> comments = List.of(
                    new AiDto.BatchCommentDto("c1", "Ủng hộ shop nhiều"),
                    new AiDto.BatchCommentDto("c2", "Hàng lừa đảo thất vọng ghê")
            );

            AiDto.BatchPredictResponse mockResponse = new AiDto.BatchPredictResponse(
                    2,
                    List.of(
                            new AiDto.BatchCommentResultDto(
                                    "c1", "Ủng hộ shop nhiều", "ủng_hộ shop nhiều",
                                    new AiDto.TaskPredictionDto(0, "NON-TOXIC", 0.99, Map.of("NON-TOXIC", 0.99, "TOXIC", 0.01)),
                                    new AiDto.TaskPredictionDto(0, "CLEAN", 0.99, Map.of("CLEAN", 0.99, "HATE", 0.01)),
                                    new AiDto.TaskPredictionDto(2, "POSITIVE", 0.98, Map.of("POSITIVE", 0.98, "NEGATIVE", 0.02))
                            ),
                            new AiDto.BatchCommentResultDto(
                                    "c2", "Hàng lừa đảo thất vọng ghê", "hàng lừa_đảo thất_vọng ghê",
                                    new AiDto.TaskPredictionDto(1, "TOXIC", 0.96, Map.of("NON-TOXIC", 0.04, "TOXIC", 0.96)),
                                    new AiDto.TaskPredictionDto(0, "CLEAN", 0.95, Map.of("CLEAN", 0.95, "HATE", 0.05)),
                                    new AiDto.TaskPredictionDto(0, "NEGATIVE", 0.97, Map.of("POSITIVE", 0.03, "NEGATIVE", 0.97))
                            )
                    )
            );

            mockServer.expect(requestTo("http://localhost:8000/predict/batch"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header("X-API-Key", "test-secret-key"))
                    .andRespond(withSuccess(objectMapper.writeValueAsString(mockResponse), MediaType.APPLICATION_JSON));

            AiDto.BatchPredictResponse response = aiServiceClient.predictBatch(comments);

            assertNotNull(response);
            assertEquals(2, response.total());
            assertEquals("c1", response.predictions().get(0).id());
            assertEquals("POSITIVE", response.predictions().get(0).sentiment().label());
            assertEquals("c2", response.predictions().get(1).id());
            assertEquals("TOXIC", response.predictions().get(1).toxicity().label());
            mockServer.verify();
        }
    }
}

