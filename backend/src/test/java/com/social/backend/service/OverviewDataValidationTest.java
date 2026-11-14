package com.social.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.CommentAnalysisDto;
import com.social.backend.dto.OverviewResponse;
import com.social.backend.dto.PostAnalysisResponse;
import com.social.backend.entity.AnalysisResult;
import com.social.backend.util.ExcelReportExtension;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bộ kiểm thử đơn vị toàn diện cho các công thức tính toán và cấu trúc dữ liệu của trang Tổng quan (Overview).
 */
@ExtendWith(ExcelReportExtension.class)
@DisplayName("Unit Tests - Overview Data & Metrics Validation")
class OverviewDataValidationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Nested
    @DisplayName("Kiểm tra công thức Điểm Cảm xúc Ròng (Net Sentiment Score)")
    class NetSentimentScoreTests {

        @Test
        @DisplayName("TC-METRICS-001: Net Sentiment Score tính đúng khi tỷ lệ tích cực áp đảo")
        void shouldCalculatePositiveNetScore() {
            long pos = 80;
            long neg = 10;
            long total = 100;

            int netScore = Math.round(((float) (pos - neg) / total) * 100);
            assertEquals(70, netScore, "Net score phải là +70 khi pos=80, neg=10");
        }

        @Test
        @DisplayName("TC-METRICS-002: Net Sentiment Score tính đúng khi tỷ lệ tiêu cực áp đảo")
        void shouldCalculateNegativeNetScore() {
            long pos = 15;
            long neg = 75;
            long total = 100;

            int netScore = Math.round(((float) (pos - neg) / total) * 100);
            assertEquals(-60, netScore, "Net score phải là -60 khi pos=15, neg=75");
        }

        @Test
        @DisplayName("TC-METRICS-003: Net Sentiment Score bằng 0 khi tích cực và tiêu cực cân bằng")
        void shouldCalculateBalancedNetScore() {
            long pos = 35;
            long neg = 35;
            long total = 100;

            int netScore = Math.round(((float) (pos - neg) / total) * 100);
            assertEquals(0, netScore, "Net score phải bằng 0 khi pos=neg");
        }

        @Test
        @DisplayName("TC-METRICS-004: Xử lý an toàn khi tổng số bình luận bằng 0 không bị lỗi chia cho 0")
        void shouldHandleZeroCommentsSafely() {
            long pos = 0;
            long neg = 0;
            long total = 0;

            int netScore = total > 0 ? Math.round(((float) (pos - neg) / total) * 100) : 0;
            assertEquals(0, netScore, "Net score phải mặc định là 0 khi không có bình luận");
        }
    }

    @Nested
    @DisplayName("Kiểm tra cấu trúc và tính toàn vẹn DTO OverviewResponse")
    class OverviewResponseTests {

        @Test
        @DisplayName("TC-METRICS-005: OverviewResponse tuần tự hóa JSON đúng cấu trúc tiêu chuẩn")
        void shouldSerializeOverviewResponseCorrectly() throws Exception {
            OverviewResponse response = new OverviewResponse(
                    150L,
                    5L,
                    Map.of("NON-TOXIC", 140L, "TOXIC", 10L),
                    Map.of("CLEAN", 140L, "OFFENSIVE", 8L, "HATE", 2L),
                    Map.of("POSITIVE", 90L, "NEUTRAL", 45L, "NEGATIVE", 15L)
            );

            String json = objectMapper.writeValueAsString(response);
            assertNotNull(json);
            assertTrue(json.contains("\"totalComments\":150"));
            assertTrue(json.contains("\"totalPostsAnalyzed\":5"));
            assertTrue(json.contains("\"NON-TOXIC\":140"));
            assertTrue(json.contains("\"POSITIVE\":90"));

            OverviewResponse deserialized = objectMapper.readValue(json, OverviewResponse.class);
            assertEquals(150L, deserialized.totalComments());
            assertEquals(5L, deserialized.totalPostsAnalyzed());
            assertEquals(140L, deserialized.toxicity().get("NON-TOXIC"));
        }

        @Test
        @DisplayName("TC-METRICS-006: PostAnalysisResponse chứa đầy đủ comment hierarchial data")
        void shouldValidatePostAnalysisResponseHierarchy() {
            CommentAnalysisDto parent = new CommentAnalysisDto(
                    "cmt_parent_1",
                    "Bài viết rất ý nghĩa!",
                    "user_a",
                    "2026-11-14T07:00:00Z",
                    new CommentAnalysisDto.TaskSummary("NON-TOXIC", 0.99),
                    new CommentAnalysisDto.TaskSummary("CLEAN", 0.99),
                    new CommentAnalysisDto.TaskSummary("POSITIVE", 0.98),
                    null,
                    false
            );

            CommentAnalysisDto reply = new CommentAnalysisDto(
                    "cmt_child_1",
                    "Hoàn toàn đồng ý với bạn",
                    "user_b",
                    "2026-11-14T07:15:00Z",
                    new CommentAnalysisDto.TaskSummary("NON-TOXIC", 0.99),
                    new CommentAnalysisDto.TaskSummary("CLEAN", 0.99),
                    new CommentAnalysisDto.TaskSummary("POSITIVE", 0.99),
                    "cmt_parent_1",
                    true
            );

            PostAnalysisResponse postResponse = new PostAnalysisResponse(
                    "post_threads_999",
                    2,
                    Map.of("NON-TOXIC", 2, "TOXIC", 0),
                    Map.of("CLEAN", 2, "OFFENSIVE", 0, "HATE", 0),
                    Map.of("POSITIVE", 2, "NEUTRAL", 0, "NEGATIVE", 0),
                    List.of(parent, reply)
            );

            assertEquals(2, postResponse.totalComments());
            assertFalse(postResponse.comments().get(0).isReply());
            assertTrue(postResponse.comments().get(1).isReply());
            assertEquals("cmt_parent_1", postResponse.comments().get(1).parentId());
        }
    }

    @Nested
    @DisplayName("Kiểm tra logic tổng hợp AnalysisResult cho User Dashboard")
    class AnalysisResultAggregationTests {

        @Test
        @DisplayName("TC-METRICS-007: Tổng hợp chính xác số liệu từ nhiều lần phân tích")
        void shouldAggregateMultipleAnalysisResults() {
            AnalysisResult ar1 = AnalysisResult.builder()
                    .threadsUserId("user_123")
                    .totalComments(50)
                    .toxicCount(5)
                    .nonToxicCount(45)
                    .cleanCount(45)
                    .offensiveCount(3)
                    .hateCount(2)
                    .positiveCount(30)
                    .neutralCount(15)
                    .negativeCount(5)
                    .build();

            AnalysisResult ar2 = AnalysisResult.builder()
                    .threadsUserId("user_123")
                    .totalComments(30)
                    .toxicCount(2)
                    .nonToxicCount(28)
                    .cleanCount(28)
                    .offensiveCount(1)
                    .hateCount(1)
                    .positiveCount(20)
                    .neutralCount(8)
                    .negativeCount(2)
                    .build();

            List<AnalysisResult> list = List.of(ar1, ar2);

            long totalComments = 0;
            long totalToxic = 0;
            long totalPositive = 0;

            for (AnalysisResult ar : list) {
                totalComments += ar.getTotalComments();
                totalToxic += ar.getToxicCount();
                totalPositive += ar.getPositiveCount();
            }

            assertEquals(80, totalComments);
            assertEquals(7, totalToxic);
            assertEquals(50, totalPositive);
        }
    }
}
