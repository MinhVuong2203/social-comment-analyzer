package com.social.backend.controller;

import com.social.backend.entity.User;
import com.social.backend.repository.UserRepository;
import com.social.backend.service.UserLimitService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * API Cài đặt người dùng:
 * - Lấy / lưu ngưỡng % cảnh báo cho các mô hình (toxic, hate, sentiment) - chỉ VIP
 * - Lấy / lưu theme (light/dark) - cho tất cả
 */
@RestController
@RequestMapping("/api/user/settings")
@RequiredArgsConstructor
@Slf4j
public class UserSettingsController {

    private final UserRepository userRepository;
    private final UserLimitService userLimitService;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void initSettingsTable() {
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS user_settings (" +
                "  threads_user_id VARCHAR(100) PRIMARY KEY," +
                "  theme VARCHAR(20) DEFAULT 'dark'," +
                "  toxic_threshold INTEGER DEFAULT 50," +
                "  hate_threshold INTEGER DEFAULT 50," +
                "  sentiment_threshold INTEGER DEFAULT 50," +
                "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()" +
                ")"
            );
            log.info("Bảng user_settings đã sẵn sàng.");
        } catch (Exception e) {
            log.warn("Không thể tạo bảng user_settings: {}", e.getMessage());
        }
    }

    /**
     * Lấy cài đặt của người dùng
     * GET /api/user/settings
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings(HttpSession session) {
        String userId = requireUserId(session);
        Map<String, Object> settings = loadSettings(userId);
        settings.put("isVip", userLimitService.isVipOrAdmin(userId));
        return ResponseEntity.ok(settings);
    }

    /**
     * Lưu cài đặt của người dùng
     * PUT /api/user/settings
     * Body: { theme?, toxicThreshold?, hateThreshold?, sentimentThreshold? }
     */
    @PutMapping
    public ResponseEntity<Map<String, Object>> saveSettings(
            @RequestBody Map<String, Object> body,
            HttpSession session
    ) {
        String userId = requireUserId(session);
        boolean isVip = userLimitService.isVipOrAdmin(userId);

        Map<String, Object> current = loadSettings(userId);

        // Theme - cho tất cả người dùng
        if (body.containsKey("theme")) {
            String theme = body.get("theme").toString();
            if ("light".equals(theme) || "dark".equals(theme)) {
                current.put("theme", theme);
            }
        }

        // Ngưỡng cảnh báo - chỉ cho VIP/Admin
        if (isVip) {
            if (body.containsKey("toxicThreshold")) {
                int val = parseThreshold(body.get("toxicThreshold"));
                current.put("toxicThreshold", val);
            }
            if (body.containsKey("hateThreshold")) {
                int val = parseThreshold(body.get("hateThreshold"));
                current.put("hateThreshold", val);
            }
            if (body.containsKey("sentimentThreshold")) {
                int val = parseThreshold(body.get("sentimentThreshold"));
                current.put("sentimentThreshold", val);
            }
        }

        // Lưu vào DB
        try {
            jdbcTemplate.update(
                "INSERT INTO user_settings (threads_user_id, theme, toxic_threshold, hate_threshold, sentiment_threshold, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, NOW()) " +
                "ON CONFLICT (threads_user_id) DO UPDATE SET " +
                "  theme = EXCLUDED.theme," +
                "  toxic_threshold = EXCLUDED.toxic_threshold," +
                "  hate_threshold = EXCLUDED.hate_threshold," +
                "  sentiment_threshold = EXCLUDED.sentiment_threshold," +
                "  updated_at = NOW()",
                userId,
                current.get("theme"),
                current.get("toxicThreshold"),
                current.get("hateThreshold"),
                current.get("sentimentThreshold")
            );
        } catch (Exception e) {
            log.warn("Lỗi lưu user_settings: {}", e.getMessage());
        }

        current.put("isVip", isVip);
        return ResponseEntity.ok(current);
    }

    private Map<String, Object> loadSettings(String userId) {
        Map<String, Object> defaults = new HashMap<>();
        defaults.put("theme", "dark");
        defaults.put("toxicThreshold", 50);
        defaults.put("hateThreshold", 50);
        defaults.put("sentimentThreshold", 50);

        try {
            var rows = jdbcTemplate.queryForList(
                "SELECT theme, toxic_threshold, hate_threshold, sentiment_threshold FROM user_settings WHERE threads_user_id = ?",
                userId
            );
            if (!rows.isEmpty()) {
                Map<String, Object> row = rows.get(0);
                defaults.put("theme", row.getOrDefault("theme", "dark"));
                defaults.put("toxicThreshold", row.getOrDefault("toxic_threshold", 50));
                defaults.put("hateThreshold", row.getOrDefault("hate_threshold", 50));
                defaults.put("sentimentThreshold", row.getOrDefault("sentiment_threshold", 50));
            }
        } catch (Exception e) {
            log.debug("Lỗi load user_settings: {}", e.getMessage());
        }

        return defaults;
    }

    private int parseThreshold(Object val) {
        try {
            int v = Integer.parseInt(val.toString());
            return Math.max(0, Math.min(100, v));
        } catch (Exception e) {
            return 50;
        }
    }

    private String requireUserId(HttpSession session) {
        String userId = (String) session.getAttribute("threads_user_id");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        return userId;
    }
}
