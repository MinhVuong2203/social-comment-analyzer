package com.social.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.social.backend.entity.Comment;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.PredictionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - ThreadsPostService.syncPostReplies (Đồng bộ reply cho trang Thống kê)")
class ThreadsPostServiceSyncRepliesTest {

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

    private ObjectNode responseWithReply(String id, String repliedToId) {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode item = root.putArray("data").addObject();
        item.put("id", id);
        item.put("username", "an");
        item.put("text", "nội dung");
        item.put("timestamp", "2026-01-01T00:00:00+0000");
        if (repliedToId != null) {
            item.putObject("replied_to").put("id", repliedToId);
        }
        return root;
    }

    @Test
    @DisplayName("ST-SY-001: Không có token thì trả false và không gọi Threads")
    void shouldNotCallThreadsWithoutToken() {
        assertFalse(threadsPostService.syncPostReplies("p1", null));
        assertFalse(threadsPostService.syncPostReplies("p1", "  "));

        verifyNoInteractions(threadsOAuthService, commentRepository);
    }

    @Test
    @DisplayName("ST-SY-002: Lưu reply mới lấy từ /conversation với đủ thông tin")
    void shouldSaveNewReplyFromConversation() {
        when(threadsOAuthService.getPostConversation("p1", "token")).thenReturn(responseWithReply("c1", "p1"));
        when(commentRepository.findByThreadsCommentId("c1")).thenReturn(Optional.empty());

        assertTrue(threadsPostService.syncPostReplies("p1", "token"));

        ArgumentCaptor<Comment> saved = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        assertEquals("c1", saved.getValue().getThreadsCommentId());
        assertEquals("p1", saved.getValue().getThreadsPostId());
        assertEquals("an", saved.getValue().getUsername());
        assertEquals("2026-01-01T00:00:00+0000", saved.getValue().getThreadsTimestamp());
        // replied_to chính là bài gốc nên đây là bình luận cấp 1
        assertNull(saved.getValue().getParentId());
        assertFalse(saved.getValue().getIsReply());
        verify(threadsOAuthService, never()).getPostReplies(any(), any());
    }

    @Test
    @DisplayName("ST-SY-003: Reply của bình luận khác được gắn parentId")
    void shouldLinkNestedReplyToParent() {
        when(threadsOAuthService.getPostConversation("p1", "token")).thenReturn(responseWithReply("c2", "c1"));
        when(commentRepository.findByThreadsCommentId("c2")).thenReturn(Optional.empty());

        threadsPostService.syncPostReplies("p1", "token");

        ArgumentCaptor<Comment> saved = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        assertEquals("c1", saved.getValue().getParentId());
        assertTrue(saved.getValue().getIsReply());
    }

    @Test
    @DisplayName("ST-SY-004: Fallback sang /replies khi /conversation không có dữ liệu")
    void shouldFallBackToRepliesEndpoint() {
        when(threadsOAuthService.getPostConversation("p1", "token")).thenReturn(null);
        when(threadsOAuthService.getPostReplies("p1", "token")).thenReturn(responseWithReply("c1", null));
        when(commentRepository.findByThreadsCommentId("c1")).thenReturn(Optional.empty());

        assertTrue(threadsPostService.syncPostReplies("p1", "token"));

        verify(commentRepository).save(any(Comment.class));
    }

    @Test
    @DisplayName("ST-SY-005: Reply đã có thì cập nhật, không tạo bản ghi trùng")
    void shouldUpdateExistingReply() {
        Comment existing = Comment.builder().id(7L).threadsCommentId("c1").text("nội dung cũ").build();
        when(threadsOAuthService.getPostConversation("p1", "token")).thenReturn(responseWithReply("c1", "p1"));
        when(commentRepository.findByThreadsCommentId("c1")).thenReturn(Optional.of(existing));

        assertTrue(threadsPostService.syncPostReplies("p1", "token"));

        verify(commentRepository).save(existing);
        assertEquals(7L, existing.getId());
        assertEquals("nội dung", existing.getText());
    }

    @Test
    @DisplayName("ST-SY-006: Threads từ chối (HTTP 4xx) thì trả false, không ném lỗi")
    void shouldReturnFalseWhenThreadsRejects() {
        when(threadsOAuthService.getPostConversation("p1", "token"))
                .thenThrow(new HttpClientErrorException(HttpStatus.FORBIDDEN));

        assertFalse(threadsPostService.syncPostReplies("p1", "token"));

        verifyNoInteractions(commentRepository);
    }

    @Test
    @DisplayName("ST-SY-007: Mất kết nối tới Threads thì trả false, không ném lỗi")
    void shouldReturnFalseWhenThreadsUnreachable() {
        when(threadsOAuthService.getPostConversation("p1", "token"))
                .thenThrow(new ResourceAccessException("timeout"));

        assertFalse(threadsPostService.syncPostReplies("p1", "token"));
    }

    @Test
    @DisplayName("ST-SY-008: Cả hai endpoint trả dữ liệu không hợp lệ thì trả false")
    void shouldReturnFalseForInvalidResponse() {
        when(threadsOAuthService.getPostConversation("p1", "token")).thenReturn(objectMapper.createObjectNode());
        when(threadsOAuthService.getPostReplies("p1", "token")).thenReturn(objectMapper.createObjectNode());

        assertFalse(threadsPostService.syncPostReplies("p1", "token"));

        verifyNoInteractions(commentRepository);
    }

    @Test
    @DisplayName("ST-SY-009: Threads trả danh sách rỗng vẫn là đồng bộ thành công")
    void shouldTreatEmptyListAsSuccess() {
        ObjectNode empty = objectMapper.createObjectNode();
        empty.putArray("data");
        when(threadsOAuthService.getPostConversation("p1", "token")).thenReturn(empty);

        assertTrue(threadsPostService.syncPostReplies("p1", "token"));

        verify(commentRepository, never()).save(any());
    }
}
