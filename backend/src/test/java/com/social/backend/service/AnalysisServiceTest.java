package com.social.backend.service;

import com.social.backend.util.ExcelReportExtension;

import com.social.backend.dto.*;
import com.social.backend.entity.*;
import com.social.backend.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

/**
 * Unit Test tầng Service cho AnalysisService (Lõi tích hợp AI PhoBERT, Batch Analysis, Thống kê DB).
 */
@ExtendWith({MockitoExtension.class, ExcelReportExtension.class})
class AnalysisServiceTest {

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private ThreadsOAuthService threadsOAuthService;

    @Mock
    private PostRepository postRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private AnalysisResultRepository analysisResultRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AnalysisService analysisService;

    @Test
    @DisplayName("TC-API-045: predictSingle - Gọi sang AiServiceClient và trả về kết quả dự đoán")
    void shouldCallAiServiceClientForSinglePredict() {
        AiDto.SinglePredictResponse expected = new AiDto.SinglePredictResponse(
                "Rất hay",
                "rất hay",
                new AiDto.TaskPredictionDto(0, "NON-TOXIC", 0.99, Map.of("NON-TOXIC", 0.99, "TOXIC", 0.01)),
                new AiDto.TaskPredictionDto(0, "CLEAN", 0.99, Map.of("CLEAN", 0.99, "HATE", 0.01)),
                new AiDto.TaskPredictionDto(2, "POSITIVE", 0.98, Map.of("POSITIVE", 0.98, "NEGATIVE", 0.02))
        );

        when(aiServiceClient.predict("Rất hay")).thenReturn(expected);

        AiDto.SinglePredictResponse result = analysisService.predictSingle("Rất hay");

        assertNotNull(result);
        assertEquals("NON-TOXIC", result.toxicity().label());
        assertEquals("POSITIVE", result.sentiment().label());
        verify(aiServiceClient, times(1)).predict("Rất hay");
    }

    @Test
    @DisplayName("TC-API-046: predictBatch - Gọi sang AiServiceClient và trả về kết quả phân tích theo lô")
    void shouldCallAiServiceClientForBatchPredict() {
        List<AiDto.BatchCommentDto> input = List.of(new AiDto.BatchCommentDto("c1", "Tuyệt vời"));
        AiDto.BatchPredictResponse expected = new AiDto.BatchPredictResponse(
                1,
                List.of(new AiDto.BatchCommentResultDto(
                        "c1", "Tuyệt vời", "tuyệt_vời",
                        new AiDto.TaskPredictionDto(0, "NON-TOXIC", 0.99, Map.of("NON-TOXIC", 0.99, "TOXIC", 0.01)),
                        new AiDto.TaskPredictionDto(0, "CLEAN", 0.99, Map.of("CLEAN", 0.99, "HATE", 0.01)),
                        new AiDto.TaskPredictionDto(2, "POSITIVE", 0.99, Map.of("POSITIVE", 0.99, "NEGATIVE", 0.01))
                ))
        );

        when(aiServiceClient.predictBatch(input)).thenReturn(expected);

        AiDto.BatchPredictResponse result = analysisService.predictBatch(input);

        assertNotNull(result);
        assertEquals(1, result.total());
        assertEquals("c1", result.predictions().get(0).id());
        verify(aiServiceClient, times(1)).predictBatch(input);
    }

    @Test
    @DisplayName("TC-API-047: analyzePost - Bài viết chưa có bình luận nào -> Trả về tổng số 0")
    void shouldHandleAnalyzePostWithZeroComments() {
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("post_zero"))
                .thenReturn(Collections.emptyList());

        PostAnalysisResponse response = analysisService.analyzePost("post_zero", "user_1", null);

        assertNotNull(response);
        assertEquals(0, response.totalComments());
        assertEquals(0, response.toxicity().get("TOXIC"));
        assertEquals(0, response.sentiment().get("POSITIVE"));
        verifyNoInteractions(aiServiceClient);
    }

    @Test
    @DisplayName("TC-API-048: analyzePost - Phân tích toàn bộ bình luận & replies, lưu DB và tính đúng thống kê")
    void shouldAnalyzePostAndSavePredictions() {
        Comment c1 = Comment.builder().threadsCommentId("c1").text("Rất tuyệt").username("user_a").parentId(null).isReply(false).build();
        Comment r1 = Comment.builder().threadsCommentId("r1").text("Quá tệ hại").username("user_b").parentId("c1").isReply(true).build();

        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("post_full"))
                .thenReturn(List.of(c1, r1));

        AiDto.BatchPredictResponse mockAiRes = new AiDto.BatchPredictResponse(
                2,
                List.of(
                        new AiDto.BatchCommentResultDto(
                                "c1", "Rất tuyệt", "rất tuyệt",
                                new AiDto.TaskPredictionDto(0, "NON-TOXIC", 0.98, Map.of("NON-TOXIC", 0.98, "TOXIC", 0.02)),
                                new AiDto.TaskPredictionDto(0, "CLEAN", 0.99, Map.of("CLEAN", 0.99, "HATE", 0.01)),
                                new AiDto.TaskPredictionDto(2, "POSITIVE", 0.95, Map.of("POSITIVE", 0.95, "NEGATIVE", 0.05))
                        ),
                        new AiDto.BatchCommentResultDto(
                                "r1", "Quá tệ hại", "quá tệ hại",
                                new AiDto.TaskPredictionDto(1, "TOXIC", 0.96, Map.of("TOXIC", 0.96, "NON-TOXIC", 0.04)),
                                new AiDto.TaskPredictionDto(0, "CLEAN", 0.95, Map.of("CLEAN", 0.95, "HATE", 0.05)),
                                new AiDto.TaskPredictionDto(0, "NEGATIVE", 0.97, Map.of("NEGATIVE", 0.97, "POSITIVE", 0.03))
                        )
                )
        );

        when(aiServiceClient.predictBatch(anyList())).thenReturn(mockAiRes);
        when(predictionRepository.findByThreadsCommentId("c1")).thenReturn(Optional.empty());
        when(predictionRepository.findByThreadsCommentId("r1")).thenReturn(Optional.empty());

        Post post = Post.builder().threadsPostId("post_full").analyzed(false).build();
        when(postRepository.findByThreadsPostId("post_full")).thenReturn(Optional.of(post));

        PostAnalysisResponse response = analysisService.analyzePost("post_full", "user_1", null);

        assertNotNull(response);
        assertEquals("post_full", response.postId());
        assertEquals(2, response.totalComments());
        assertEquals(1, response.toxicity().get("TOXIC"));
        assertEquals(1, response.toxicity().get("NON-TOXIC"));
        assertEquals(1, response.sentiment().get("POSITIVE"));
        assertEquals(1, response.sentiment().get("NEGATIVE"));

        verify(predictionRepository, times(2)).save(any(Prediction.class));
        verify(analysisResultRepository, times(1)).save(any(AnalysisResult.class));
        verify(postRepository, times(1)).save(post);
        assertTrue(post.getAnalyzed());
    }

    @Test
    @DisplayName("TC-API-049: getPostAnalysis - Lấy kết quả phân tích đã lưu của bài viết")
    void shouldReturnSavedPostAnalysis() {
        AnalysisResult ar = AnalysisResult.builder()
                .threadsPostId("post_1")
                .totalComments(2)
                .toxicCount(0)
                .nonToxicCount(2)
                .cleanCount(2)
                .offensiveCount(0)
                .hateCount(0)
                .positiveCount(2)
                .neutralCount(0)
                .negativeCount(0)
                .build();

        Comment comment = Comment.builder().threadsCommentId("cmt_1").text("Hay").username("u1").build();
        Prediction pred = Prediction.builder()
                .threadsCommentId("cmt_1")
                .toxicityLabel("NON-TOXIC")
                .toxicityConfidence(0.99)
                .hateSpeechLabel("CLEAN")
                .hateSpeechConfidence(0.95)
                .sentimentLabel("POSITIVE")
                .sentimentConfidence(0.98)
                .build();

        when(analysisResultRepository.findFirstByThreadsPostIdOrderByCreatedAtDesc("post_1"))
                .thenReturn(Optional.of(ar));
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("post_1"))
                .thenReturn(List.of(comment));
        when(predictionRepository.findByThreadsPostId("post_1"))
                .thenReturn(List.of(pred));

        Optional<PostAnalysisResponse> res = analysisService.getPostAnalysis("post_1");

        assertTrue(res.isPresent());
        assertEquals("post_1", res.get().postId());
        assertEquals(2, res.get().totalComments());
    }

    @Test
    @DisplayName("TC-API-050: getOverview - Tính toán tổng hợp chính xác dữ liệu Dashboard của user")
    void shouldCalculateOverviewCorrectly() {
        AnalysisResult ar1 = AnalysisResult.builder()
                .totalComments(10).toxicCount(2).nonToxicCount(8)
                .cleanCount(9).offensiveCount(1).hateCount(0)
                .positiveCount(6).neutralCount(2).negativeCount(2)
                .build();

        AnalysisResult ar2 = AnalysisResult.builder()
                .totalComments(5).toxicCount(0).nonToxicCount(5)
                .cleanCount(5).offensiveCount(0).hateCount(0)
                .positiveCount(4).neutralCount(1).negativeCount(0)
                .build();

        when(analysisResultRepository.findByThreadsUserIdOrderByCreatedAtDesc("user_overview"))
                .thenReturn(List.of(ar1, ar2));

        OverviewResponse overview = analysisService.getOverview("user_overview");

        assertNotNull(overview);
        assertEquals(15L, overview.totalComments());
        assertEquals(2L, overview.totalPostsAnalyzed());
        assertEquals(2L, overview.toxicity().get("TOXIC"));
        assertEquals(13L, overview.toxicity().get("NON-TOXIC"));
        assertEquals(10L, overview.sentiment().get("POSITIVE"));
        assertEquals(2L, overview.sentiment().get("NEGATIVE"));
    }
}
