package com.social.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.social.backend.service.ThreadsOAuthService;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class ThreadsOAuthController {

    private final ThreadsOAuthService threadsOAuthService;

    public ThreadsOAuthController(
            ThreadsOAuthService threadsOAuthService
    ) {
        this.threadsOAuthService = threadsOAuthService;
    }

    /**
     * Bắt đầu đăng nhập Threads
     *
     * GET /auth/threads
     */
    @GetMapping("/auth/threads")
    public ResponseEntity<Void> loginThreads() {

        String authorizationUrl =
                threadsOAuthService.buildAuthorizationUrl();

        return ResponseEntity
                .status(302)
                .header("Location", authorizationUrl)
                .build();
    }


    /**
     * Threads redirect về đây sau khi user Allow
     *
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
                    .header(
                            "Location",
                            "http://localhost:5173/login?error="
                                    + error
                    )
                    .build();
        }


        /*
         * Không nhận được code
         */
        if (code == null || code.isBlank()) {

            return ResponseEntity
                    .status(302)
                    .header(
                            "Location",
                            "http://localhost:5173/login?error=no_code"
                    )
                    .build();
        }


        try {

            /*
             * 1. Đổi authorization code
             *    -> access token
             */
            JsonNode tokenResponse =
                    threadsOAuthService.exchangeCodeForToken(code);

            String accessToken =
                    tokenResponse.get("access_token").asText();

            String userId =
                    tokenResponse.get("user_id").asText();


            /*
             * 2. Lấy thông tin user Threads
             */
            JsonNode user =
                    threadsOAuthService.getMe(accessToken);


            String username =
                    user.has("username")
                            ? user.get("username").asText()
                            : "";

            String name =
                    user.has("name")
                            ? user.get("name").asText()
                            : "";

            String profilePicture =
                    user.has("threads_profile_picture_url")
                            ? user.get("threads_profile_picture_url").asText()
                            : "";


            /*
             * 3. Lưu thông tin vào Session
             *
             * QUAN TRỌNG:
             * accessToken nằm ở backend/session,
             * không gửi trực tiếp sang React.
             */
            session.setAttribute(
                    "threads_access_token",
                    accessToken
            );

            session.setAttribute(
                    "threads_user_id",
                    userId
            );

            session.setAttribute(
                    "threads_username",
                    username
            );

            session.setAttribute(
                    "threads_name",
                    name
            );

            session.setAttribute(
                    "threads_profile_picture",
                    profilePicture
            );


                System.out.println("==============================");
                System.out.println("CALLBACK SESSION ID: " + session.getId());
                System.out.println(
                        "CALLBACK USER ID: "
                        + session.getAttribute("threads_user_id")
                );
                System.out.println("==============================");


            /*
             * 4. Redirect về React
             */
            return ResponseEntity
                    .status(302)
                    .header(
                            "Location",
                            "http://localhost:5173/"
                    )
                    .build();

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(302)
                    .header(
                            "Location",
                            "http://localhost:5173/login?error=oauth_failed"
                    )
                    .build();
        }
    }


    /**
     * React gọi API này để lấy user hiện tại
     *
     * GET /api/auth/me
     */
    @GetMapping("/api/auth/me")
    public ResponseEntity<?> getCurrentUser(
            HttpSession session
    ) {
        System.out.println("==============================");
        System.out.println("SESSION ID: " + session.getId());
        System.out.println(
                "USER ID: " +
                session.getAttribute("threads_user_id")
        );
        System.out.println(
                "USERNAME: " +
                session.getAttribute("threads_username")
        );
        System.out.println("==============================");

        Object userId =
                session.getAttribute("threads_user_id");

        /*
         * Chưa đăng nhập
         */
        if (userId == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            Map.of(
                                    "authenticated",
                                    false
                            )
                    );
        }


        Map<String, Object> user =
                new HashMap<>();

        user.put(
                "authenticated",
                true
        );

        user.put(
                "id",
                session.getAttribute("threads_user_id")
        );

        user.put(
                "username",
                session.getAttribute("threads_username")
        );

        user.put(
                "name",
                session.getAttribute("threads_name")
        );

        user.put(
                "profilePicture",
                session.getAttribute("threads_profile_picture")
        );

        return ResponseEntity.ok(user);
    }


    /**
     * Đăng xuất
     *
     * POST /api/auth/logout
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<?> logout(
            HttpSession session
    ) {

        session.invalidate();

        return ResponseEntity.ok(
                Map.of(
                        "success",
                        true
                )
        );
    }
}