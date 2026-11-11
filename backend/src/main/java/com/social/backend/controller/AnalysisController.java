package com.social.backend.controller;

import com.social.backend.dto.AiDto;
import com.social.backend.dto.OverviewResponse;
import com.social.backend.dto.PostAnalysisResponse;
import com.social.backend.entity.AnalysisResult;
import com.social.backend.service.AnalysisService;
import com.social.backend.service.UserLimitService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
public class AnalysisController {

    private final AnalysisService analysisService;
    private final UserLimitService userLimitService;

    public AnalysisController(AnalysisService analysisService, UserLimitService userLimitService) {
        this.analysisService = analysisService;
        this.userLimitService = userLimitService;
    }

    /**
     * Phân tích 1 bình luận văn bản trực tiếp qua mô hình PhoBERT
     * POST /api/analysis/predict
     */
    @PostMapping("/api/analysis/predict")
    public ResponseEntity<AiDto.SinglePredictResponse> predictSingle(
            @RequestBody AiDto.PredictRequest request
    ) {
        if (request == null || request.text() == null || request.text().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nội dung văn bản không được để trống");
        }
        return ResponseEntity.ok(analysisService.predictSingle(request.text()));
    }

    /**
     * Phân tích nhiều bình luận văn bản dạng batch
     * POST /api/analysis/batch
     */
    @PostMapping("/api/analysis/batch")
    public ResponseEntity<AiDto.BatchPredictResponse> predictBatch(
            @RequestBody AiDto.BatchPredictRequest request
    ) {
        if (request == null || request.comments() == null || request.comments().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách bình luận không được để trống");
        }
        return ResponseEntity.ok(analysisService.predictBatch(request.comments()));
    }

    /**
     * Phân tích toàn bộ bình luận của một bài viết trên Threads:
     * Lấy bình luận từ Threads API -> Gọi AI Service phân tích batch -> Lưu kết quả vào DB -> Trả về kết quả
     * POST /api/posts/{postId}/analyze
     */
    @PostMapping("/api/posts/{postId}/analyze")
    public ResponseEntity<?> analyzePost(
            @PathVariable String postId,
            HttpSession session
    ) {
        String userId = (String) session.getAttribute("threads_user_id");
        String accessToken = (String) session.getAttribute("threads_access_token");

        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập trước khi phân tích bài viết");
        }

        // Kiểm tra giới hạn phân tích hàng ngày (chỉ áp dụng non-VIP và non-Admin)
        if (!userLimitService.canAnalyze(userId)) {
            int limit = userLimitService.getDailyAnalyzeLimit();
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                "error", "QUOTA_EXCEEDED",
                "message", "Bạn đã đạt giới hạn " + limit + " lần phân tích trong ngày hôm nay. Nâng cấp VIP để phân tích không giới hạn.",
                "limit", limit,
                "remaining", 0
            ));
        }

        PostAnalysisResponse response = analysisService.analyzePost(postId, userId, accessToken);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy kết quả phân tích đã lưu của bài viết
     * GET /api/posts/{postId}/analysis
     */
    @GetMapping("/api/posts/{postId}/analysis")
    public ResponseEntity<PostAnalysisResponse> getPostAnalysis(@PathVariable String postId) {
        return analysisService.getPostAnalysis(postId)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết này chưa được phân tích"));
    }

    /**
     * Lấy lịch sử các lần phân tích của tài khoản hiện tại
     * GET /api/analysis/history
     */
    @GetMapping("/api/analysis/history")
    public ResponseEntity<List<AnalysisResult>> getAnalysisHistory(HttpSession session) {
        String userId = (String) session.getAttribute("threads_user_id");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        return ResponseEntity.ok(analysisService.getAnalysisHistory(userId));
    }

    /**
     * Thống kê tổng quan phục vụ Dashboard
     * GET /api/overview
     */
    @GetMapping("/api/overview")
    public ResponseEntity<OverviewResponse> getOverview(HttpSession session) {
        String userId = (String) session.getAttribute("threads_user_id");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        return ResponseEntity.ok(analysisService.getOverview(userId));
    }

    /**
     * Lấy trạng thái VIP và quota còn lại trong ngày của người dùng
     * GET /api/user/limit-status
     */
    @GetMapping("/api/user/limit-status")
    public ResponseEntity<Map<String, Object>> getUserLimitStatus(HttpSession session) {
        String userId = (String) session.getAttribute("threads_user_id");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }

        boolean isVipOrAdmin = userLimitService.isVipOrAdmin(userId);
        int remainingAnalysis = userLimitService.remainingAnalysis(userId);
        int remainingExports = userLimitService.remainingExports(userId);
        int analyzeLimit = userLimitService.getDailyAnalyzeLimit();
        int exportLimit = userLimitService.getDailyExportLimit();

        return ResponseEntity.ok(Map.of(
            "isVipOrAdmin", isVipOrAdmin,
            "remainingAnalysis", remainingAnalysis,
            "remainingExports", remainingExports,
            "dailyAnalyzeLimit", analyzeLimit,
            "dailyExportLimit", exportLimit,
            "usedAnalysis", isVipOrAdmin ? 0 : (analyzeLimit - remainingAnalysis),
            "usedExports", isVipOrAdmin ? 0 : (exportLimit - remainingExports)
        ));
    }
}
