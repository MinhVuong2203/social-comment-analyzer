package com.social.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.social.backend.entity.User;
import com.social.backend.service.ThreadsOAuthService;
import com.social.backend.service.UserService;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
public class ThreadsOAuthController {

    private final ThreadsOAuthService threadsOAuthService;
    private final UserService userService;

    public ThreadsOAuthController(
            ThreadsOAuthService threadsOAuthService,
            UserService userService
    ) {
        this.threadsOAuthService = threadsOAuthService;
        this.userService = userService;
    }

    /**
     * Bắt đầu đăng nhập Threads
     * GET /auth/threads
     */
    @GetMapping("/auth/threads")
    public ResponseEntity<Void> loginThreads() {
        String authorizationUrl = threadsOAuthService.buildAuthorizationUrl();
        return ResponseEntity
                .status(302)
                .header("Location", authorizationUrl)
                .build();
    }

    /**
     * Threads redirect về đây sau khi user Allow
     * GET /auth/threads/callback?code=...
     */
    @GetMapping("/auth/threads/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description,
            HttpSession session
    ) {
        /*
         * User từ chối đăng nhập
         */
        if (error != null) {
            return ResponseEntity
                    .status(302)
                    .header("Location", "http://localhost:5173/login?error=" + error)
                    .build();
        }

        /*
         * Không nhận được code
         */
        if (code == null || code.isBlank()) {
            return ResponseEntity
                    .status(302)
                    .header("Location", "http://localhost:5173/login?error=no_code")
                    .build();
        }

        try {
            /*
             * 1. Đổi authorization code -> access token
             */
            JsonNode tokenResponse = threadsOAuthService.exchangeCodeForToken(code);
            String accessToken = tokenResponse.get("access_token").asText();
            String userId = tokenResponse.get("user_id").asText();

            /*
             * 2. Lấy thông tin user Threads
             */
            JsonNode userNode = threadsOAuthService.getMe(accessToken);
            String username = userNode.has("username") ? userNode.get("username").asText() : "";
            String name = userNode.has("name") ? userNode.get("name").asText() : "";
            String profilePicture = userNode.has("threads_profile_picture_url")
                    ? userNode.get("threads_profile_picture_url").asText()
                    : "";

            /*
             * 3. Đồng bộ với cơ sở dữ liệu và kiểm tra khóa tài khoản
             */
            User dbUser = userService.syncThreadsUser(userId, username, name, profilePicture);
            if (dbUser.getStatus() == User.UserStatus.BLOCKED) {
                return ResponseEntity
                        .status(302)
                        .header("Location", "http://localhost:5173/login?error=account_blocked")
                        .build();
            }

            /*
             * 4. Lưu thông tin vào Session
             */
            session.setAttribute("threads_access_token", accessToken);
            session.setAttribute("threads_user_id", userId);
            session.setAttribute("threads_username", username);
            session.setAttribute("threads_name", name);
            session.setAttribute("threads_profile_picture", profilePicture);
            session.setAttribute("user_role", dbUser.getRole().name());
            session.setAttribute("user_status", dbUser.getStatus().name());

            /*
             * 5. Redirect về React
             */
            return ResponseEntity
                    .status(302)
                    .header("Location", "http://localhost:5173/")
                    .build();

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity
                    .status(302)
                    .header("Location", "http://localhost:5173/login?error=oauth_failed")
                    .build();
        }
    }

    /**
     * React gọi API này để lấy user hiện tại
     * GET /api/auth/me
     */
    @GetMapping("/api/auth/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        Object userId = session.getAttribute("threads_user_id");

        if (userId == null) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("authenticated", false));
        }

        String userIdStr = userId.toString();
        Optional<User> dbUserOpt = userService.findByThreadsUserId(userIdStr);
        String role = "USER";
        String status = "ACTIVE";

        if (dbUserOpt.isPresent()) {
            User u = dbUserOpt.get();
            role = u.getRole().name();
            status = u.getStatus().name();

            if (u.getStatus() == User.UserStatus.BLOCKED) {
                session.invalidate();
                return ResponseEntity.status(403).body(Map.of(
                        "authenticated", false,
                        "error", "Tài khoản của bạn đã bị khóa bởi Quản trị viên."
                ));
            }
        }

        Map<String, Object> user = new HashMap<>();
        user.put("authenticated", true);
        user.put("id", session.getAttribute("threads_user_id"));
        user.put("username", session.getAttribute("threads_username"));
        user.put("name", session.getAttribute("threads_name"));
        user.put("profilePicture", session.getAttribute("threads_profile_picture"));
        user.put("role", role);
        user.put("status", status);

        return ResponseEntity.ok(user);
    }

    /**
     * Đăng xuất
     * POST /api/auth/logout
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("success", true));
    }
}
