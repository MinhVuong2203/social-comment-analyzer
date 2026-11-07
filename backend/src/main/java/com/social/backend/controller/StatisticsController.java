package com.social.backend.controller;

import com.social.backend.dto.StatisticsResponse;
import com.social.backend.service.StatisticsExportService;
import com.social.backend.service.StatisticsService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/statistics/posts/{postId}")
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final StatisticsExportService statisticsExportService;

    public StatisticsController(
            StatisticsService statisticsService,
            StatisticsExportService statisticsExportService
    ) {
        this.statisticsService = statisticsService;
        this.statisticsExportService = statisticsExportService;
    }

    /**
     * Dữ liệu trang Thống kê của một bài viết
     * GET /api/statistics/posts/{postId}
     */
    @GetMapping
    public ResponseEntity<StatisticsResponse> getStatistics(@PathVariable String postId, HttpSession session) {
        String userId = requireUserId(session);
        String accessToken = (String) session.getAttribute("threads_access_token");
        return ResponseEntity.ok(statisticsService.getStatistics(postId, userId, accessToken));
    }

    /**
     * Tải báo cáo của một bài viết
     * GET /api/statistics/posts/{postId}/export?format=csv|json|xlsx
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @PathVariable String postId,
            @RequestParam String format,
            HttpSession session
    ) {
        String userId = requireUserId(session);
        StatisticsExportService.Format exportFormat = StatisticsExportService.Format.parse(format);
        byte[] file = statisticsExportService.export(postId, userId, exportFormat);

        String safePostId = postId.replaceAll("[^A-Za-z0-9_-]", "");
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("thong-ke-" + safePostId + "." + exportFormat.extension())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(exportFormat.contentType()))
                .body(file);
    }

    private String requireUserId(HttpSession session) {
        String userId = (String) session.getAttribute("threads_user_id");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        return userId;
    }
}
