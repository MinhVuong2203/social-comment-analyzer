package com.social.backend.controller;

import com.social.backend.util.ExcelReportExtension;

import com.social.backend.dto.CommentAnalysisDto;
import com.social.backend.dto.PostDto;
import com.social.backend.service.ThreadsPostService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit Test tầng Controller cho ThreadsPostController (Quản lý Bài viết & Bình luận Threads).
 * Kiểm tra các mã trạng thái HTTP, xác thực Session, dữ liệu trả về theo đúng bảng kịch bản Testcase Excel.
 */
@ExtendWith({MockitoExtension.class, ExcelReportExtension.class})
class ThreadsPostControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ThreadsPostService threadsPostService;

    @BeforeEach
    void setUp() {
        ThreadsPostController controller = new ThreadsPostController(threadsPostService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Nested
    @DisplayName("GET /api/posts - Lấy danh sách bài viết Threads của người dùng")
    class GetUserPostsTests {

        @Test
        @DisplayName("TC-API-016: Lấy bài viết khi chưa đăng nhập (Session thiếu threads_user_id) -> 401 Unauthorized")
        void shouldReturn401WhenNotLoggedIn() throws Exception {
            MockHttpSession session = new MockHttpSession();

            mockMvc.perform(get("/api/posts").session(session))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-API-017: Lấy bài viết khi đã đăng nhập thành công -> 200 OK kèm danh sách bài viết")
        void shouldReturn200WithPostsWhenLoggedIn() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "user_threads_123");
            session.setAttribute("threads_access_token", "valid_access_token_xyz");

            List<PostDto> mockPosts = List.of(
                    new PostDto("post_001", "Bài viết số 1", "https://threads.net/p/1", "TEXT_POST", "2026-11-01T10:00:00Z", 5, true),
                    new PostDto("post_002", "Bài viết số 2", "https://threads.net/p/2", "TEXT_POST", "2026-11-02T10:00:00Z", 0, false)
            );

            when(threadsPostService.fetchAndSyncUserPosts("user_threads_123", "valid_access_token_xyz"))
                    .thenReturn(mockPosts);

            mockMvc.perform(get("/api/posts").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].id").value("post_001"))
                    .andExpect(jsonPath("$[0].text").value("Bài viết số 1"))
                    .andExpect(jsonPath("$[0].totalReplies").value(5))
                    .andExpect(jsonPath("$[0].analyzed").value(true))
                    .andExpect(jsonPath("$[1].id").value("post_002"));
        }

        @Test
        @DisplayName("TC-API-018: Lấy bài viết khi tài khoản chưa có bài viết nào -> 200 OK mảng rỗng []")
        void shouldReturn200EmptyArrayWhenNoPosts() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "user_new");
            session.setAttribute("threads_access_token", "token_new");

            when(threadsPostService.fetchAndSyncUserPosts("user_new", "token_new"))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/posts").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("TC-API-019: Gọi endpoint bài viết với method không hợp lệ (POST) -> 405 Method Not Allowed")
        void shouldReturn405ForInvalidMethodPost() throws Exception {
            mockMvc.perform(post("/api/posts"))
                    .andExpect(status().isMethodNotAllowed());
        }
    }

    @Nested
    @DisplayName("GET /api/posts/{postId} - Lấy chi tiết một bài viết")
    class GetPostByIdTests {

        @Test
        @DisplayName("TC-API-020: Lấy chi tiết bài viết tồn tại -> 200 OK kèm thông tin bài viết")
        void shouldReturn200WhenPostExists() throws Exception {
            PostDto postDto = new PostDto("post_999", "Nội dung bài viết mẫu", "https://threads.net/p/999", "IMAGE_POST", "2026-11-05T08:00:00Z", 12, true);
            when(threadsPostService.getPostById("post_999")).thenReturn(Optional.of(postDto));

            mockMvc.perform(get("/api/posts/post_999"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value("post_999"))
                    .andExpect(jsonPath("$.text").value("Nội dung bài viết mẫu"))
                    .andExpect(jsonPath("$.totalReplies").value(12));
        }

        @Test
        @DisplayName("TC-API-021: Lấy chi tiết bài viết không tồn tại -> 404 Not Found")
        void shouldReturn404WhenPostNotFound() throws Exception {
            when(threadsPostService.getPostById("non_existing_post")).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/posts/non_existing_post"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("TC-API-022: Gọi chi tiết bài viết với method DELETE -> 405 Method Not Allowed")
        void shouldReturn405ForInvalidMethodDelete() throws Exception {
            mockMvc.perform(delete("/api/posts/post_999"))
                    .andExpect(status().isMethodNotAllowed());
        }
    }

    @Nested
    @DisplayName("GET /api/posts/{postId}/comments - Lấy danh sách bình luận và replies của bài viết")
    class GetPostCommentsTests {

        @Test
        @DisplayName("TC-API-023: Lấy danh sách bình luận kèm replies lồng nhau và kết quả AI -> 200 OK")
        void shouldReturn200WithCommentsAndReplies() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_access_token", "valid_token");

            List<CommentAnalysisDto> mockComments = List.of(
                    // Bình luận cấp 1
                    new CommentAnalysisDto(
                            "cmt_001",
                            "Bài viết rất hữu ích!",
                            "user_a",
                            "2026-11-06T10:00:00Z",
                            new CommentAnalysisDto.TaskSummary("NON-TOXIC", 0.98),
                            new CommentAnalysisDto.TaskSummary("CLEAN", 0.99),
                            new CommentAnalysisDto.TaskSummary("POSITIVE", 0.95),
                            null,
                            false
                    ),
                    // Reply con của cmt_001
                    new CommentAnalysisDto(
                            "reply_001_1",
                            "Đồng ý với bạn, ứng dụng rất tốt",
                            "user_b",
                            "2026-11-06T10:05:00Z",
                            new CommentAnalysisDto.TaskSummary("NON-TOXIC", 0.97),
                            new CommentAnalysisDto.TaskSummary("CLEAN", 0.98),
                            new CommentAnalysisDto.TaskSummary("POSITIVE", 0.92),
                            "cmt_001",
                            true
                    )
            );

            when(threadsPostService.getPostCommentsWithAnalysis(eq("post_100"), anyString()))
                    .thenReturn(mockComments);

            mockMvc.perform(get("/api/posts/post_100/comments").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.postId").value("post_100"))
                    .andExpect(jsonPath("$.total").value(2))
                    .andExpect(jsonPath("$.comments[0].id").value("cmt_001"))
                    .andExpect(jsonPath("$.comments[0].isReply").value(false))
                    .andExpect(jsonPath("$.comments[0].toxicity.label").value("NON-TOXIC"))
                    .andExpect(jsonPath("$.comments[1].id").value("reply_001_1"))
                    .andExpect(jsonPath("$.comments[1].parentId").value("cmt_001"))
                    .andExpect(jsonPath("$.comments[1].isReply").value(true));
        }

        @Test
        @DisplayName("TC-API-024: Bài viết chưa có bình luận nào trên Threads -> 200 OK với total = 0")
        void shouldReturn200EmptyWhenNoComments() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_access_token", "TH_TOKEN");

            when(threadsPostService.getPostCommentsWithAnalysis(eq("post_empty"), any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/posts/post_empty/comments").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.postId").value("post_empty"))
                    .andExpect(jsonPath("$.total").value(0))
                    .andExpect(jsonPath("$.comments.length()").value(0));
        }
    }
}
