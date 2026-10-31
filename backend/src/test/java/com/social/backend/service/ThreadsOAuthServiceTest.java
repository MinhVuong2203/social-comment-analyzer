package com.social.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class ThreadsOAuthServiceTest {

    private ThreadsOAuthService threadsOAuthService;

    @BeforeEach
    void setUp() {
        threadsOAuthService = new ThreadsOAuthService();
        ReflectionTestUtils.setField(threadsOAuthService, "threadId", "test_app_12345");
        ReflectionTestUtils.setField(threadsOAuthService, "threadSecret", "test_secret_abc");
        ReflectionTestUtils.setField(threadsOAuthService, "redirectUri", "http://localhost:8080/auth/threads/callback");
    }

    @Test
    @DisplayName("TC-API-011: buildAuthorizationUrl phải tạo đúng định dạng URL OAuth")
    void shouldBuildValidAuthorizationUrl() {
        String url = threadsOAuthService.buildAuthorizationUrl();

        assertNotNull(url, "URL không được null");
        assertTrue(url.startsWith("https://threads.net/oauth/authorize"), "Phải bắt đầu bằng OAuth URL của Threads");
        assertTrue(url.contains("client_id=test_app_12345"), "Phải chứa client_id đã cấu hình");
        assertTrue(url.contains("scope=threads_basic,threads_read_replies"), "Phải chứa các quyền threads_basic, threads_read_replies");
        assertTrue(url.contains("response_type=code"), "Response type phải là code");
        assertTrue(url.contains("state="), "Phải có tham số state ngẫu nhiên");
        assertTrue(url.contains("redirect_uri="), "Phải chứa redirect_uri");
    }
}

