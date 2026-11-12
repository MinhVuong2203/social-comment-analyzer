package com.social.backend.service;

import com.social.backend.util.ExcelReportExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.social.backend.dto.CommentAnalysisDto;
import com.social.backend.dto.PostDto;
import com.social.backend.entity.Comment;
import com.social.backend.entity.Post;
import com.social.backend.entity.Prediction;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.PredictionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit Test tầng Service cho ThreadsPostService.
 */
@ExtendWith({MockitoExtension.class, ExcelReportExtension.class})
class ThreadsPostServiceTest {

    @Mock
    private ThreadsOAuthService threadsOAuthService;

    @Mock
    private PostRepository postRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @InjectMocks
    private ThreadsPostService threadsPostService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("TC-API-038: fetchAndSyncUserPosts - Đồng bộ bài viết từ Threads API và lưu DB thành công")
    void shouldFetchAndSyncUserPostsSuccessfully() {
        ObjectNode rootNode = objectMapper.createObjectNode();
        ArrayNode dataArray = rootNode.putArray("data");
        ObjectNode postNode = dataArray.addObject();
        postNode.put("id", "post_api_1");
        postNode.put("text", "Hôm nay thời tiết đẹp quá");
        postNode.put("permalink", "https://threads.net/p/api1");
        postNode.put("media_type", "TEXT_POST");
        postNode.put("timestamp", "2026-11-01T12:00:00Z");

        when(threadsOAuthService.getUserPosts("token_123")).thenReturn(rootNode);
        when(postRepository.findByThreadsPostId("post_api_1")).thenReturn(Optional.empty());

        List<PostDto> result = threadsPostService.fetchAndSyncUserPosts("user_threads_1", "token_123");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("post_api_1", result.get(0).id());
        assertEquals("Hôm nay thời tiết đẹp quá", result.get(0).text());
        verify(postRepository, times(1)).save(any(Post.class));
    }

    @Test
    @DisplayName("TC-API-039: fetchAndSyncUserPosts - Threads API lỗi -> Fallback đọc bài viết từ DB")
    void shouldFallbackToDatabaseWhenThreadsApiFails() {
        when(threadsOAuthService.getUserPosts("expired_token"))
                .thenThrow(new RuntimeException("Token expired"));

        Post dbPost = Post.builder()
                .threadsPostId("post_db_1")
                .threadsUserId("user_threads_1")
                .text("Bài viết lưu trong DB")
                .permalink("https://threads.net/p/db1")
                .mediaType("TEXT_POST")
                .threadsTimestamp("2026-11-01T10:00:00Z")
                .analyzed(false)
                .totalReplies(0)
                .build();

        when(postRepository.findByThreadsUserIdOrderByCreatedAtDesc("user_threads_1"))
                .thenReturn(List.of(dbPost));

        List<PostDto> result = threadsPostService.fetchAndSyncUserPosts("user_threads_1", "expired_token");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("post_db_1", result.get(0).id());
        assertEquals("Bài viết lưu trong DB", result.get(0).text());
    }

    @Test
    @DisplayName("TC-API-040: getPostById - Tìm thấy bài viết theo threadsPostId")
    void shouldReturnPostWhenFound() {
        Post post = Post.builder()
                .threadsPostId("post_found")
                .text("Chi tiết bài viết")
                .permalink("https://threads.net/p/found")
                .mediaType("TEXT_POST")
                .threadsTimestamp("2026-11-02T10:00:00Z")
                .analyzed(true)
                .totalReplies(3)
                .build();

        when(postRepository.findByThreadsPostId("post_found")).thenReturn(Optional.of(post));

        Optional<PostDto> result = threadsPostService.getPostById("post_found");

        assertTrue(result.isPresent());
        assertEquals("post_found", result.get().id());
        assertTrue(result.get().analyzed());
    }

    @Test
    @DisplayName("TC-API-041: getPostById - Không tìm thấy bài viết")
    void shouldReturnEmptyWhenPostNotFound() {
        when(postRepository.findByThreadsPostId("post_missing")).thenReturn(Optional.empty());

        Optional<PostDto> result = threadsPostService.getPostById("post_missing");

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("TC-API-042: getPostCommentsWithAnalysis - Ưu tiên gọi /conversation lấy cả comment cấp 1 và replies con")
    void shouldFetchConversationWithNestedReplies() {
        // Giả lập dữ liệu trả về từ /conversation gồm 1 comment cấp 1 và 1 reply con
        ObjectNode conversationNode = objectMapper.createObjectNode();
        ArrayNode dataArray = conversationNode.putArray("data");

        // Comment cấp 1
        ObjectNode c1 = dataArray.addObject();
        c1.put("id", "c1");
        c1.put("username", "user_parent");
        c1.put("text", "Dự án này làm tốt lắm");
        c1.put("timestamp", "2026-11-06T10:00:00Z");
        c1.put("is_reply", false);

        // Reply con (replied_to trỏ tới c1)
        ObjectNode r1 = dataArray.addObject();
        r1.put("id", "r1");
        r1.put("username", "user_child");
        r1.put("text", "Cảm ơn bạn nhiều nhé!");
        r1.put("timestamp", "2026-11-06T10:05:00Z");
        r1.put("is_reply", true);
        r1.putObject("replied_to").put("id", "c1");

        when(threadsOAuthService.getPostConversation("post_test", "token_abc")).thenReturn(conversationNode);
        when(commentRepository.findByThreadsCommentId("c1")).thenReturn(Optional.empty());
        when(commentRepository.findByThreadsCommentId("r1")).thenReturn(Optional.empty());

        // Giả lập comment đã lưu trong DB
        Comment savedC1 = Comment.builder().threadsCommentId("c1").text("Dự án này làm tốt lắm").username("user_parent").parentId(null).isReply(false).build();
        Comment savedR1 = Comment.builder().threadsCommentId("r1").text("Cảm ơn bạn nhiều nhé!").username("user_child").parentId("c1").isReply(true).build();
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("post_test")).thenReturn(List.of(savedC1, savedR1));
        when(predictionRepository.findByThreadsPostId("post_test")).thenReturn(Collections.emptyList());

        List<CommentAnalysisDto> result = threadsPostService.getPostCommentsWithAnalysis("post_test", "token_abc");

        assertNotNull(result);
        assertEquals(2, result.size());

        // Kiểm tra quan hệ cha-con
        assertEquals("c1", result.get(0).id());
        assertNull(result.get(0).parentId());
        assertFalse(result.get(0).isReply());

        assertEquals("r1", result.get(1).id());
        assertEquals("c1", result.get(1).parentId());
        assertTrue(result.get(1).isReply());

        verify(commentRepository, times(2)).save(any(Comment.class));
    }

    @Test
    @DisplayName("TC-API-043: getPostCommentsWithAnalysis - /conversation lỗi -> Fallback sang /replies")
    void shouldFallbackToRepliesWhenConversationFails() {
        when(threadsOAuthService.getPostConversation("post_fallback", "token_xyz")).thenReturn(null);

        ObjectNode repliesNode = objectMapper.createObjectNode();
        ArrayNode dataArray = repliesNode.putArray("data");
        ObjectNode c = dataArray.addObject();
        c.put("id", "c_fallback");
        c.put("username", "user_fb");
        c.put("text", "Bình luận cấp 1");
        c.put("timestamp", "2026-11-06T11:00:00Z");

        when(threadsOAuthService.getPostReplies("post_fallback", "token_xyz")).thenReturn(repliesNode);
        when(commentRepository.findByThreadsCommentId("c_fallback")).thenReturn(Optional.empty());
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("post_fallback")).thenReturn(Collections.emptyList());
        when(predictionRepository.findByThreadsPostId("post_fallback")).thenReturn(Collections.emptyList());

        List<CommentAnalysisDto> result = threadsPostService.getPostCommentsWithAnalysis("post_fallback", "token_xyz");

        assertNotNull(result);
        verify(threadsOAuthService, times(1)).getPostReplies("post_fallback", "token_xyz");
    }

    @Test
    @DisplayName("TC-API-044: getPostCommentsWithAnalysis - Ánh xạ đúng nhãn kết quả AI (Prediction) vào DTO")
    void shouldMapPredictionsCorrectlyToDto() {
        Comment comment = Comment.builder()
                .threadsCommentId("cmt_pred")
                .text("Nội dung test")
                .username("user_test")
                .threadsTimestamp("2026-11-06T12:00:00Z")
                .build();

        Prediction prediction = Prediction.builder()
                .threadsCommentId("cmt_pred")
                .threadsPostId("post_pred")
                .toxicityLabel("TOXIC")
                .toxicityConfidence(0.95)
                .hateSpeechLabel("CLEAN")
                .hateSpeechConfidence(0.97)
                .sentimentLabel("NEGATIVE")
                .sentimentConfidence(0.98)
                .build();

        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("post_pred")).thenReturn(List.of(comment));
        when(predictionRepository.findByThreadsPostId("post_pred")).thenReturn(List.of(prediction));

        List<CommentAnalysisDto> result = threadsPostService.getPostCommentsWithAnalysis("post_pred", null);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TOXIC", result.get(0).toxicity().label());
        assertEquals(0.95, result.get(0).toxicity().confidence());
        assertEquals("NEGATIVE", result.get(0).sentiment().label());
    }
}
