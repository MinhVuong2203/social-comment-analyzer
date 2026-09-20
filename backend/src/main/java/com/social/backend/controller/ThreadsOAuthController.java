package com.social.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.social.backend.service.ThreadsOAuthService;

@RestController
public class ThreadsOAuthController {

    private final ThreadsOAuthService threadsOAuthService;

    public ThreadsOAuthController(
            ThreadsOAuthService threadsOAuthService
    ) {
        this.threadsOAuthService = threadsOAuthService;
    }

    /**
     * Bắt đầu OAuth
     *
     * GET /auth/threads
     */
    @GetMapping("/auth/threads")
    public String loginThreads() {

        return """
                <html>
                <body>
                    <h2>Threads OAuth</h2>

                    <a href="%s">
                        <button style="
                            padding: 12px 20px;
                            font-size: 16px;
                            cursor: pointer;
                        ">
                            Login with Threads
                        </button>
                    </a>

                </body>
                </html>
                """.formatted(
                threadsOAuthService.buildAuthorizationUrl()
        );
    }

    /**
     * Threads redirect về đây sau khi user Allow
     *
     * GET /auth/threads/callback?code=...
     */
    @GetMapping("/auth/threads/callback")
    public String callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description
    ) {

        // User từ chối
        if (error != null) {

            return """
                    <h2>Threads OAuth Failed</h2>
                    <p>Error: %s</p>
                    <p>Description: %s</p>
                    """.formatted(
                    error,
                    error_description
            );
        }

        // Không có code
        if (code == null || code.isBlank()) {

            return """
                    <h2>OAuth Failed</h2>
                    <p>Không nhận được authorization code.</p>
                    """;
        }

        try {

            System.out.println("==============================");
            System.out.println("AUTHORIZATION CODE:");
            System.out.println(code);
            System.out.println("==============================");

            // 1. Đổi code -> access token
            JsonNode tokenResponse =
                    threadsOAuthService.exchangeCodeForToken(code);

            String accessToken =
                    tokenResponse.get("access_token").asText();

            String userId =
                    tokenResponse.get("user_id").asText();

            System.out.println("THREADS USER ID:");
            System.out.println(userId);

            System.out.println("ACCESS TOKEN:");
            System.out.println(accessToken);

            // 2. Lấy profile
            JsonNode user =
                    threadsOAuthService.getMe(accessToken);

            System.out.println("==============================");
            System.out.println("THREADS USER:");
            System.out.println(user.toPrettyString());
            System.out.println("==============================");

            String username =
                    user.has("username")
                            ? user.get("username").asText()
                            : "";

            return """
                    <html>
                    <body>
                        <h2>Threads Login Success!</h2>

                        <p><b>User ID:</b> %s</p>

                        <p><b>Username:</b> @%s</p>

                        <p>
                            OAuth đã hoạt động thành công.
                        </p>
                    </body>
                    </html>
                    """.formatted(
                    userId,
                    username
            );

        } catch (Exception e) {

            e.printStackTrace();

            return """
                    <html>
                    <body>
                        <h2>OAuth Error</h2>

                        <pre>%s</pre>
                    </body>
                    </html>
                    """.formatted(
                    e.getMessage()
            );
        }
    }
}