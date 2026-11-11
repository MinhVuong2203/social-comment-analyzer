package com.social.backend.service;

import com.social.backend.dto.StatisticsResponse;
import com.social.backend.dto.StatisticsResponse.Keyword;
import com.social.backend.dto.StatisticsResponse.Status;
import com.social.backend.dto.StatisticsResponse.TrendPoint;
import com.social.backend.entity.Comment;
import com.social.backend.entity.Post;
import com.social.backend.entity.Prediction;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.PredictionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - StatisticsService (Tính số liệu trang Thống kê)")
class StatisticsServiceTest {

    private static final Instant NOW = Instant.parse("2026-01-01T02:30:00Z");

    @Mock
    private PostRepository postRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private ThreadsPostService threadsPostService;

    @InjectMocks
    private StatisticsService statisticsService;

    private static Post post(String timestamp) {
        return Post.builder().threadsPostId("p1").threadsUserId("owner").threadsTimestamp(timestamp).build();
    }

    private static Comment comment(String id, String text, String timestamp) {
        return Comment.builder().threadsCommentId(id).threadsPostId("p1").text(text).threadsTimestamp(timestamp).build();
    }

    private static Prediction prediction(String commentId, String toxicity, String hate, String sentiment) {
        return Prediction.builder()
                .threadsCommentId(commentId)
                .threadsPostId("p1")
                .toxicityLabel(toxicity)
                .hateSpeechLabel(hate)
                .sentimentLabel(sentiment)
                .build();
    }

    private static StatisticsResponse build(String postTime, List<Comment> comments, List<Prediction> predictions) {
        return StatisticsService.buildStatistics(post(postTime), comments, predictions, NOW, true);
    }

    @Test
    @DisplayName("ST-SV-001: Đồng bộ reply trước khi đọc DB, lần đầu mở trang đã thấy dữ liệu")
    void shouldSyncRepliesBeforeReading() {
        when(postRepository.findByThreadsPostId("p1")).thenReturn(Optional.of(post(null)));
        when(threadsPostService.syncPostReplies("p1", "token")).thenReturn(true);
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("p1"))
                .thenReturn(List.of(comment("c1", "xin chào", null)));
        when(predictionRepository.findByThreadsPostId("p1")).thenReturn(List.of());

        StatisticsResponse result = statisticsService.getStatistics("p1", "owner", "token");

        assertEquals(1, result.totalReplies());
        assertEquals(Status.NOT_ANALYZED, result.status());
        assertTrue(result.repliesSynced());
        InOrder order = inOrder(threadsPostService, commentRepository);
        order.verify(threadsPostService).syncPostReplies("p1", "token");
        order.verify(commentRepository).findByThreadsPostIdOrderByCreatedAtDesc("p1");
    }

    @Test
    @DisplayName("ST-SV-002: Threads lỗi thì báo repliesSynced=false, không giả làm bài không có reply")
    void shouldReportFailedSync() {
        when(postRepository.findByThreadsPostId("p1")).thenReturn(Optional.of(post(null)));
        when(threadsPostService.syncPostReplies("p1", "token")).thenReturn(false);
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("p1")).thenReturn(List.of());
        when(predictionRepository.findByThreadsPostId("p1")).thenReturn(List.of());

        assertFalse(statisticsService.getStatistics("p1", "owner", "token").repliesSynced());
    }

    @Test
    @DisplayName("ST-SV-003: Bài của người khác trả 404 và không gọi Threads bằng token của người dùng")
    void shouldNotSyncPostOfAnotherUser() {
        when(postRepository.findByThreadsPostId("p1")).thenReturn(Optional.of(post(null)));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> statisticsService.getStatistics("p1", "stranger", "token"));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(threadsPostService, never()).syncPostReplies(any(), any());
    }

    @Test
    @DisplayName("ST-SV-004: Bài không tồn tại trả 404")
    void shouldReturnNotFoundForMissingPost() {
        when(postRepository.findByThreadsPostId("missing")).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> statisticsService.getStatistics("missing", "owner", "token"));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    @DisplayName("ST-SV-005: Phân tích đúng các định dạng thời gian của Threads")
    void shouldParseThreadsTimestampFormats() {
        Instant expected = Instant.parse("2026-01-01T00:00:00Z");
        assertEquals(Optional.of(expected), StatisticsService.parseTimestamp("2026-01-01T00:00:00+0000"));
        assertEquals(Optional.of(expected), StatisticsService.parseTimestamp("2026-01-01T07:00:00+07:00"));
        assertEquals(Optional.of(expected), StatisticsService.parseTimestamp("2026-01-01T00:00:00Z"));
    }

    @Test
    @DisplayName("ST-SV-006: Thời gian rỗng, thiếu múi giờ hoặc sai định dạng được bỏ qua an toàn")
    void shouldIgnoreInvalidTimestamps() {
        assertEquals(Optional.empty(), StatisticsService.parseTimestamp("2026-01-01T00:00:00"));
        assertEquals(Optional.empty(), StatisticsService.parseTimestamp("không phải thời gian"));
        assertEquals(Optional.empty(), StatisticsService.parseTimestamp("   "));
        assertEquals(Optional.empty(), StatisticsService.parseTimestamp(null));
    }

    @Test
    @DisplayName("ST-SV-007: Bài chưa có reply không lỗi chia cho 0")
    void shouldHandleEmptyPost() {
        StatisticsResponse result = build("2026-01-01T00:00:00+0000", List.of(), List.of());

        assertEquals(Status.NO_REPLIES, result.status());
        assertEquals(0.0, result.analyzedPercent());
        assertEquals(0.0, result.toxic().percent());
        assertEquals(0.0, result.positive().percent());
        assertTrue(result.trend().points().isEmpty());
        assertTrue(result.keywords().isEmpty());
    }

    @Test
    @DisplayName("ST-SV-008: Đếm nhãn và tính % trên số reply đã phân tích; OFFENSIVE không tính là HATE")
    void shouldCountLabelsOverAnalyzedReplies() {
        List<Comment> comments = List.of(
                comment("c1", "a", "2026-01-01T00:10:00+0000"),
                comment("c2", "b", "2026-01-01T01:45:00+0000"),
                comment("c3", "c", "2026-01-01T02:00:00+0000"),
                comment("c4", "d", "2026-01-01T02:10:00+0000")
        );
        List<Prediction> predictions = List.of(
                prediction("c1", "TOXIC", "HATE", "NEGATIVE"),
                prediction("c2", "toxic", "OFFENSIVE", "NEGATIVE"),
                prediction("c3", "NON-TOXIC", "CLEAN", "POSITIVE")
        );

        StatisticsResponse result = build("2026-01-01T00:00:00+0000", comments, predictions);

        assertEquals(Status.HAS_NEW_REPLIES, result.status());
        assertEquals(4, result.totalReplies());
        assertEquals(3, result.analyzedReplies());
        assertEquals(75.0, result.analyzedPercent());
        assertEquals(2, result.toxic().count());
        assertEquals(66.7, result.toxic().percent());
        assertEquals(1, result.hate().count());
        assertEquals(33.3, result.hate().percent());
        assertEquals(2, result.negative().count());
        assertEquals(1, result.positive().count());
        assertEquals(0, result.neutral().count());
    }

    @Test
    @DisplayName("ST-SV-009: Nhãn cảm xúc lạ hoặc rỗng được tính là trung tính")
    void shouldCountUnknownSentimentAsNeutral() {
        List<Comment> comments = List.of(comment("c1", "a", null), comment("c2", "b", null));
        List<Prediction> predictions = List.of(
                prediction("c1", "NON-TOXIC", "CLEAN", "MIXED"),
                prediction("c2", "NON-TOXIC", "CLEAN", null)
        );

        StatisticsResponse result = build(null, comments, predictions);

        assertEquals(2, result.neutral().count());
        assertEquals(100.0, result.neutral().percent());
    }

    @Test
    @DisplayName("ST-SV-010: Đã phân tích hết thì FINALIZED; % đã phân tích không vượt 100")
    void shouldFinalizeAndCapAnalyzedPercent() {
        List<Comment> comments = List.of(comment("c1", "a", null));
        List<Prediction> predictions = List.of(
                prediction("c1", "NON-TOXIC", "CLEAN", "POSITIVE"),
                prediction("c-da-xoa", "NON-TOXIC", "CLEAN", "POSITIVE")
        );

        StatisticsResponse result = build(null, comments, predictions);

        assertEquals(Status.FINALIZED, result.status());
        assertEquals(100.0, result.analyzedPercent());
    }

    @Test
    @DisplayName("ST-SV-011: Reply trong 60 phút gần nhất tính cả biên, bỏ reply cũ hơn và reply ở tương lai")
    void shouldCountRepliesInLastHour() {
        List<Comment> comments = List.of(
                comment("bien", "a", "2026-01-01T01:30:00+0000"),
                comment("trong", "b", "2026-01-01T02:29:00+0000"),
                comment("cu", "c", "2026-01-01T01:29:59+0000"),
                comment("tuong-lai", "d", "2026-01-01T02:31:00+0000"),
                comment("sai", "e", "sai định dạng")
        );

        assertEquals(2, build(null, comments, List.of()).repliesLastHour());
    }

    @Test
    @DisplayName("ST-SV-012: Xu hướng cộng dồn, kết thúc ở reply cuối đã phân tích, đếm reply thiếu thời gian")
    void shouldBuildCumulativeTrend() {
        List<Comment> comments = List.of(
                comment("c1", "a", "2026-01-01T00:00:00+0000"),
                comment("c2", "b", "2026-01-01T01:50:00+0000"),
                comment("bad", "c", "sai định dạng"),
                comment("unanalyzed", "d", "2026-01-01T09:00:00+0000")
        );
        List<Prediction> predictions = List.of(
                prediction("c1", "TOXIC", "CLEAN", "NEUTRAL"),
                prediction("c2", "TOXIC", "CLEAN", "NEGATIVE"),
                prediction("bad", "TOXIC", "CLEAN", "NEGATIVE")
        );

        StatisticsResponse.Trend trend = build("2026-01-01T00:00:00+0000", comments, predictions).trend();

        List<TrendPoint> points = trend.points();
        assertTrue(trend.startsAtPost());
        assertEquals(1, trend.skippedReplies());
        assertEquals(StatisticsService.TREND_POINTS, points.size());
        assertEquals(new TrendPoint(0, 1, 0), points.get(0));
        assertEquals(new TrendPoint(110, 2, 1), points.get(points.size() - 1));
        for (int i = 1; i < points.size(); i++) {
            assertTrue(points.get(i).toxic() >= points.get(i - 1).toxic());
            assertTrue(points.get(i).minutesFromStart() >= points.get(i - 1).minutesFromStart());
        }
    }

    @Test
    @DisplayName("ST-SV-013: Bài thiếu thời gian đăng thì mốc đầu là reply đầu tiên")
    void shouldStartTrendAtFirstReplyWhenPostTimeMissing() {
        StatisticsResponse.Trend trend = build(
                null,
                List.of(comment("c1", "a", "2026-01-01T00:30:00+0000")),
                List.of(prediction("c1", "TOXIC", "CLEAN", "NEGATIVE"))
        ).trend();

        assertFalse(trend.startsAtPost());
        assertEquals(new TrendPoint(0, 1, 1), trend.points().get(0));
    }

    @Test
    @DisplayName("ST-SV-014: Reply có thời gian sớm hơn lúc đăng vẫn được tính, không làm trục thời gian âm")
    void shouldKeepRepliesEarlierThanPost() {
        StatisticsResponse.Trend trend = build(
                "2026-01-01T05:00:00+0000",
                List.of(comment("c1", "a", "2026-01-01T00:30:00+0000")),
                List.of(prediction("c1", "TOXIC", "CLEAN", "NEGATIVE"))
        ).trend();

        assertEquals(new TrendPoint(0, 1, 1), trend.points().get(StatisticsService.TREND_POINTS - 1));
    }

    @Test
    @DisplayName("ST-SV-015: Từ khóa ưu tiên cụm từ, mỗi bình luận tính một lần, gộp dạng Unicode, bỏ URL và mention")
    void shouldExtractKeywords() {
        List<Comment> comments = List.of(
                comment("c1", "Công nghệ AI rất tốt, công nghệ công nghệ!", null),
                comment("c2", "công nghệ này hay. Giá cả đắt", null),
                comment("c3", "giá cả quá đắt https://example.com/cong-nghe @congnghe", null),
                comment("c4", "công nghệ mới", null)
        );
        List<Prediction> predictions = List.of(
                prediction("c1", "NON-TOXIC", "CLEAN", "POSITIVE"),
                prediction("c2", "NON-TOXIC", "CLEAN", "POSITIVE"),
                prediction("c3", "TOXIC", "CLEAN", "NEGATIVE"),
                prediction("c4", "NON-TOXIC", "CLEAN", "POSITIVE")
        );

        List<Keyword> keywords = build(null, comments, predictions).keywords();

        assertEquals(new Keyword("công nghệ", 3, "POSITIVE"), keywords.get(0));
        assertTrue(keywords.contains(new Keyword("giá cả", 2, "NEUTRAL")));
        List<String> terms = keywords.stream().map(Keyword::term).toList();
        assertFalse(terms.contains("công"));
        assertFalse(terms.contains("nghệ"));
        assertFalse(terms.contains("này"));
        assertFalse(terms.contains("example"));
        assertFalse(terms.contains("congnghe"));
    }

    @Test
    @DisplayName("ST-SV-016: Không ghép cụm từ qua dấu câu")
    void shouldNotBuildPhrasesAcrossPunctuation() {
        List<Comment> comments = List.of(comment("c1", "điện thoại. pin tốt", null), comment("c2", "điện thoại. pin kém", null));
        List<Prediction> predictions = List.of(
                prediction("c1", "NON-TOXIC", "CLEAN", "NEUTRAL"),
                prediction("c2", "NON-TOXIC", "CLEAN", "NEUTRAL")
        );

        List<String> terms = build(null, comments, predictions).keywords().stream().map(Keyword::term).toList();

        assertTrue(terms.contains("điện thoại"));
        assertFalse(terms.contains("thoại pin"));
    }

    @Test
    @DisplayName("ST-SV-017: Giới hạn top 8 từ khóa và bỏ bình luận chưa phân tích")
    void shouldCapKeywordsAndIgnoreUnanalyzed() {
        List<Comment> comments = new ArrayList<>();
        List<Prediction> predictions = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            comments.add(comment("c" + i, "alpha, bravo, charlie, delta, echo, foxtrot, golf, hotel, india, juliet", null));
            predictions.add(prediction("c" + i, "NON-TOXIC", "CLEAN", "NEGATIVE"));
        }
        comments.add(comment("x1", "zulu", null));
        comments.add(comment("x2", "zulu", null));

        List<Keyword> keywords = build(null, comments, predictions).keywords();

        assertEquals(StatisticsService.TOP_KEYWORDS, keywords.size());
        assertTrue(keywords.stream().allMatch(k -> "NEGATIVE".equals(k.sentiment())));
        assertTrue(keywords.stream().noneMatch(k -> k.term().equals("zulu")));
    }

    @Test
    @DisplayName("ST-SV-018: Từ chỉ xuất hiện ở 1 bình luận không thành từ khóa; văn bản null không lỗi")
    void shouldRequireTwoCommentsForKeyword() {
        List<Comment> comments = List.of(comment("c1", "duy nhất", null), comment("c2", null, null));
        List<Prediction> predictions = List.of(
                prediction("c1", "NON-TOXIC", "CLEAN", "NEUTRAL"),
                prediction("c2", "NON-TOXIC", "CLEAN", "NEUTRAL")
        );

        assertTrue(build(null, comments, predictions).keywords().isEmpty());
    }
}
