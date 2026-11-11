package com.social.backend.controller;

import com.social.backend.util.ExcelReportExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.*;
import com.social.backend.entity.AnalysisResult;
import com.social.backend.service.AnalysisService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Unit Test tầng Controller cho AnalysisController (Phân tích AI PhoBERT, Batch, Lịch sử, Overview).
 */
@ExtendWith({MockitoExtension.class, ExcelReportExtension.class})
class AnalysisControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AnalysisService analysisService;

    @BeforeEach
    void setUp() {
        AnalysisController controller = new AnalysisController(analysisService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Nested
    @DisplayName("POST /api/analysis/predict - Phân tích một bình luận đơn lẻ")
    class PredictSingleTests {

        @Test
        @DisplayName("TC-API-025: Phân tích bình luận văn bản hợp lệ -> 200 OK kèm kết quả 3 tác vụ")
        void shouldReturn200ForValidSingleText() throws Exception {
            AiDto.PredictRequest request = new AiDto.PredictRequest("Bài làm quá dở");

            AiDto.SinglePredictResponse mockResponse = new AiDto.SinglePredictResponse(
                    "Bài làm quá dở",
                    "bài_làm quá dở",
                    new AiDto.TaskPredictionDto(1, "TOXIC", 0.97, Map.of("NON-TOXIC", 0.03, "TOXIC", 0.97)),
                    new AiDto.TaskPredictionDto(0, "CLEAN", 0.96, Map.of("CLEAN", 0.96, "OFFENSIVE", 0.03, "HATE", 0.01)),
                    new AiDto.TaskPredictionDto(0, "NEGATIVE", 0.98, Map.of("NEGATIVE", 0.98, "NEUTRAL", 0.01, "POSITIVE", 0.01))
            );

            when(analysisService.predictSingle("Bài làm quá dở")).thenReturn(mockResponse);

            mockMvc.perform(post("/api/analysis/predict")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.text").value("Bài làm quá dở"))
                    .andExpect(jsonPath("$.toxicity.label").value("TOXIC"))
                    .andExpect(jsonPath("$.toxicity.confidence").value(0.97))
                    .andExpect(jsonPath("$.sentiment.label").value("NEGATIVE"));
        }

        @Test
        @DisplayName("TC-API-026: Phân tích bình luận với text rỗng hoặc toàn khoảng trắng -> 400 Bad Request")
        void shouldReturn400ForBlankText() throws Exception {
            AiDto.PredictRequest request = new AiDto.PredictRequest("   ");

            mockMvc.perform(post("/api/analysis/predict")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-API-027: Phân tích bình luận với request rỗng không có body -> 400 Bad Request")
        void shouldReturn400ForEmptyBody() throws Exception {
            mockMvc.perform(post("/api/analysis/predict")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/analysis/batch - Phân tích danh sách bình luận theo lô")
    class PredictBatchTests {

        @Test
        @DisplayName("TC-API-028: Phân tích batch với danh sách bình luận hợp lệ -> 200 OK")
        void shouldReturn200ForValidBatchComments() throws Exception {
            List<AiDto.BatchCommentDto> comments = List.of(
                    new AiDto.BatchCommentDto("c1", "Tuyệt vời quá"),
                    new AiDto.BatchCommentDto("c2", "Đồ lừa đảo")
            );
            AiDto.BatchPredictRequest request = new AiDto.BatchPredictRequest(comments);

            AiDto.BatchPredictResponse mockBatchResponse = new AiDto.BatchPredictResponse(
                    2,
                    List.of(
                            new AiDto.BatchCommentResultDto(
                                    "c1", "Tuyệt vời quá", "tuyệt_vời quá",
                                    new AiDto.TaskPredictionDto(0, "NON-TOXIC", 0.99, Map.of("NON-TOXIC", 0.99, "TOXIC", 0.01)),
                                    new AiDto.TaskPredictionDto(0, "CLEAN", 0.99, Map.of("CLEAN", 0.99, "HATE", 0.01)),
                                    new AiDto.TaskPredictionDto(2, "POSITIVE", 0.96, Map.of("POSITIVE", 0.96, "NEGATIVE", 0.04))
                            ),
                            new AiDto.BatchCommentResultDto(
                                    "c2", "Đồ lừa đảo", "đồ lừa_đảo",
                                    new AiDto.TaskPredictionDto(1, "TOXIC", 0.92, Map.of("TOXIC", 0.92, "NON-TOXIC", 0.08)),
                                    new AiDto.TaskPredictionDto(0, "CLEAN", 0.94, Map.of("CLEAN", 0.94, "HATE", 0.06)),
                                    new AiDto.TaskPredictionDto(0, "NEGATIVE", 0.95, Map.of("NEGATIVE", 0.95, "POSITIVE", 0.05))
                            )
                    )
            );

            when(analysisService.predictBatch(anyList())).thenReturn(mockBatchResponse);

            mockMvc.perform(post("/api/analysis/batch")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(2))
                    .andExpect(jsonPath("$.predictions[0].id").value("c1"))
                    .andExpect(jsonPath("$.predictions[0].sentiment.label").value("POSITIVE"))
                    .andExpect(jsonPath("$.predictions[1].id").value("c2"))
                    .andExpect(jsonPath("$.predictions[1].toxicity.label").value("TOXIC"));
        }

        @Test
        @DisplayName("TC-API-029: Phân tích batch với mảng comments rỗng -> 400 Bad Request")
        void shouldReturn400ForEmptyBatch() throws Exception {
            AiDto.BatchPredictRequest request = new AiDto.BatchPredictRequest(Collections.emptyList());

            mockMvc.perform(post("/api/analysis/batch")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/posts/{postId}/analyze - Phân tích toàn bộ bình luận của bài viết")
    class AnalyzePostTests {

        @Test
        @DisplayName("TC-API-030: Phân tích bài viết khi chưa đăng nhập (Session thiếu) -> 401 Unauthorized")
        void shouldReturn401WhenSessionMissing() throws Exception {
            MockHttpSession session = new MockHttpSession();

            mockMvc.perform(post("/api/posts/post_123/analyze").session(session))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-API-031: Phân tích bài viết khi đã đăng nhập -> 200 OK kèm thống kê tổng hợp")
        void shouldReturn200ForValidAnalyzePost() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "user_123");
            session.setAttribute("threads_access_token", "token_abc");

            PostAnalysisResponse mockResponse = new PostAnalysisResponse(
                    "post_123",
                    5,
                    Map.of("NON-TOXIC", 4, "TOXIC", 1),
                    Map.of("CLEAN", 5, "OFFENSIVE", 0, "HATE", 0),
                    Map.of("POSITIVE", 3, "NEUTRAL", 1, "NEGATIVE", 1),
                    Collections.emptyList()
            );

            when(analysisService.analyzePost("post_123", "user_123", "token_abc"))
                    .thenReturn(mockResponse);

            mockMvc.perform(post("/api/posts/post_123/analyze").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.postId").value("post_123"))
                    .andExpect(jsonPath("$.totalComments").value(5))
                    .andExpect(jsonPath("$.toxicity.TOXIC").value(1))
                    .andExpect(jsonPath("$.sentiment.POSITIVE").value(3));
        }
    }

    @Nested
    @DisplayName("GET /api/posts/{postId}/analysis - Lấy kết quả phân tích bài viết đã lưu")
    class GetPostAnalysisTests {

        @Test
        @DisplayName("TC-API-032: Lấy kết quả bài viết đã phân tích -> 200 OK")
        void shouldReturn200WhenAnalysisExists() throws Exception {
            PostAnalysisResponse mockResponse = new PostAnalysisResponse(
                    "post_saved",
                    3,
                    Map.of("NON-TOXIC", 3, "TOXIC", 0),
                    Map.of("CLEAN", 3, "OFFENSIVE", 0, "HATE", 0),
                    Map.of("POSITIVE", 2, "NEUTRAL", 1, "NEGATIVE", 0),
                    Collections.emptyList()
            );

            when(analysisService.getPostAnalysis("post_saved")).thenReturn(Optional.of(mockResponse));

            mockMvc.perform(get("/api/posts/post_saved/analysis"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.postId").value("post_saved"))
                    .andExpect(jsonPath("$.totalComments").value(3));
        }

        @Test
        @DisplayName("TC-API-033: Lấy kết quả bài viết chưa từng được phân tích -> 404 Not Found")
        void shouldReturn404WhenAnalysisNotFound() throws Exception {
            when(analysisService.getPostAnalysis("post_unprocessed")).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/posts/post_unprocessed/analysis"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET /api/analysis/history - Lịch sử phân tích của người dùng")
    class GetAnalysisHistoryTests {

        @Test
        @DisplayName("TC-API-034: Lấy lịch sử phân tích khi chưa đăng nhập -> 401 Unauthorized")
        void shouldReturn401WhenNotLoggedIn() throws Exception {
            MockHttpSession session = new MockHttpSession();

            mockMvc.perform(get("/api/analysis/history").session(session))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-API-035: Lấy lịch sử phân tích khi đã đăng nhập -> 200 OK kèm danh sách bản ghi")
        void shouldReturn200WithHistoryWhenLoggedIn() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "user_history_1");

            AnalysisResult ar = AnalysisResult.builder()
                    .id(1L)
                    .threadsPostId("post_01")
                    .threadsUserId("user_history_1")
                    .totalComments(10)
                    .toxicCount(2)
                    .nonToxicCount(8)
                    .cleanCount(9)
                    .hateCount(1)
                    .positiveCount(5)
                    .neutralCount(3)
                    .negativeCount(2)
                    .createdAt(LocalDateTime.now())
                    .build();

            when(analysisService.getAnalysisHistory("user_history_1")).thenReturn(List.of(ar));

            mockMvc.perform(get("/api/analysis/history").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].threadsPostId").value("post_01"))
                    .andExpect(jsonPath("$[0].totalComments").value(10));
        }
    }

    @Nested
    @DisplayName("GET /api/overview - Thống kê tổng quan Dashboard người dùng")
    class GetOverviewTests {

        @Test
        @DisplayName("TC-API-036: Lấy Overview khi chưa đăng nhập -> 401 Unauthorized")
        void shouldReturn401WhenNotLoggedIn() throws Exception {
            MockHttpSession session = new MockHttpSession();

            mockMvc.perform(get("/api/overview").session(session))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-API-037: Lấy Overview khi đã đăng nhập -> 200 OK kèm tổng số comments, posts và phân bố cảm xúc")
        void shouldReturn200ForValidOverview() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "user_overview_1");

            OverviewResponse mockOverview = new OverviewResponse(
                    50L,
                    5L,
                    Map.of("NON-TOXIC", 45L, "TOXIC", 5L),
                    Map.of("CLEAN", 48L, "OFFENSIVE", 2L, "HATE", 0L),
                    Map.of("POSITIVE", 30L, "NEUTRAL", 15L, "NEGATIVE", 5L)
            );

            when(analysisService.getOverview("user_overview_1")).thenReturn(mockOverview);

            mockMvc.perform(get("/api/overview").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalComments").value(50))
                    .andExpect(jsonPath("$.totalPostsAnalyzed").value(5))
                    .andExpect(jsonPath("$.toxicity.TOXIC").value(5))
                    .andExpect(jsonPath("$.sentiment.POSITIVE").value(30));
        }
    }
}
