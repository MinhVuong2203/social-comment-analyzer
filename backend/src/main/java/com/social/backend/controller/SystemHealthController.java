package com.social.backend.controller;

import com.social.backend.service.AiServiceClient;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class SystemHealthController {

    private final JdbcTemplate jdbcTemplate;
    private final AiServiceClient aiServiceClient;

    public SystemHealthController(JdbcTemplate jdbcTemplate, AiServiceClient aiServiceClient) {
        this.jdbcTemplate = jdbcTemplate;
        this.aiServiceClient = aiServiceClient;
    }

    /**
     * Kiểm tra trạng thái Backend và kết nối PostgreSQL
     * GET /api/health
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Spring Boot Backend");

        try {
            jdbcTemplate.execute("SELECT 1");
            health.put("database", "CONNECTED");
        } catch (Exception e) {
            health.put("database", "DISCONNECTED: " + e.getMessage());
        }

        return ResponseEntity.ok(health);
    }

    /**
     * Kiểm tra trạng thái AI Service (FastAPI) từ Backend
     * GET /api/health/ai
     */
    @GetMapping("/ai")
    public ResponseEntity<Map<String, Object>> getAiHealth() {
        try {
            Map<String, Object> aiHealth = aiServiceClient.health();
            return ResponseEntity.ok(Map.of(
                    "status", "UP",
                    "aiService", aiHealth
            ));
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of(
                    "status", "DOWN",
                    "error", "Không thể kết nối đến AI Service: " + e.getMessage()
            ));
        }
    }
}
