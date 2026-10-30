package com.social.backend.controller;

import com.social.backend.dto.CommentAnalysisDto;
import com.social.backend.dto.PostDto;
import com.social.backend.service.ThreadsPostService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class ThreadsPostController {

    private final ThreadsPostService threadsPostService;

    public ThreadsPostController(ThreadsPostService threadsPostService) {
        this.threadsPostService = threadsPostService;
    }

    /**
     * Lấy danh sách bài viết của tài khoản Threads đã đăng nhập
     * GET /api/posts
     */
    @GetMapping
    public ResponseEntity<List<PostDto>> getUserPosts(HttpSession session) {
        String userId = (String) session.getAttribute("threads_user_id");
        String accessToken = (String) session.getAttribute("threads_access_token");

        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập Threads trước");
        }

        List<PostDto> posts = threadsPostService.fetchAndSyncUserPosts(userId, accessToken);
        return ResponseEntity.ok(posts);
    }

    /**
     * Lấy chi tiết một bài viết
     * GET /api/posts/{postId}
     */
    @GetMapping("/{postId}")
    public ResponseEntity<PostDto> getPostById(@PathVariable String postId) {
        return threadsPostService.getPostById(postId)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết: " + postId));
    }

    /**
     * Lấy danh sách replies/bình luận của bài viết (kèm nhãn phân loại AI nếu đã phân tích)
     * GET /api/posts/{postId}/comments
     */
    @GetMapping("/{postId}/comments")
    public ResponseEntity<Map<String, Object>> getPostComments(
            @PathVariable String postId,
            HttpSession session
    ) {
        String accessToken = (String) session.getAttribute("threads_access_token");
        List<CommentAnalysisDto> comments = threadsPostService.getPostCommentsWithAnalysis(postId, accessToken);
        return ResponseEntity.ok(Map.of(
                "postId", postId,
                "total", comments.size(),
                "comments", comments
        ));
    }
}
