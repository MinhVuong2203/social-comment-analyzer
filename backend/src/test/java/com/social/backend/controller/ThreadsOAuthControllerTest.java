package com.social.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.social.backend.entity.User;
import com.social.backend.service.ThreadsOAuthService;
import com.social.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// đây là Unit Test tầng Controller và Service. 
// Cô lập các phụ thuộc bên ngoài bằng kỹ thuật Stub/Mock 
// để kiểm tra tính đúng đắn của toàn bộ luồng logic OAuth 2.0 
// (Redirect 302, validation tham số callback, xử lý exception, 
// phân quyền tài khoản bị khóa và quản lý Session) theo đúng bảng kịch bản trong file Excel.


class ThreadsOAuthControllerTest {

    private MockMvc mockMvc;
    private StubThreadsOAuthService stubThreadsService;
    private StubUserService stubUserService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Stub cho ThreadsOAuthService
    static class StubThreadsOAuthService extends ThreadsOAuthService {
        String authUrl = "https://threads.net/oauth/authorize?client_id=123&redirect_uri=http://localhost:8080/auth/threads/callback";
        JsonNode tokenNode;
        JsonNode userNode;
        boolean throwExceptionOnExchange = false;

        @Override
        public String buildAuthorizationUrl() {
            return authUrl;
        }

        @Override
        public JsonNode exchangeCodeForToken(String code) throws Exception {
            if (throwExceptionOnExchange) {
                throw new RuntimeException("Threads API Error");
            }
            return tokenNode;
        }

        @Override
        public JsonNode getMe(String accessToken) {
            return userNode;
        }
    }

    // Stub cho UserService
    static class StubUserService extends UserService {
        User syncedUser;
        Optional<User> foundUser = Optional.empty();

        public StubUserService() {
            super(null, null, null);
        }

        @Override
        public User syncThreadsUser(String threadsUserId, String username, String name, String profilePictureUrl) {
            return syncedUser;
        }

        @Override
        public Optional<User> findByThreadsUserId(String threadsUserId) {
            return foundUser;
        }
    }

    @BeforeEach
    void setUp() {
        stubThreadsService = new StubThreadsOAuthService();
        stubUserService = new StubUserService();
        ThreadsOAuthController controller = new ThreadsOAuthController(stubThreadsService, stubUserService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Nested
    @DisplayName("GET /auth/threads - Khởi tạo đăng nhập Threads")
    class LoginThreadsTests {

        @Test
        @DisplayName("TC-API-001: Chuyển hướng 302 tới URL đăng nhập của Threads")
        void shouldRedirectToThreadsAuthorizationUrl() throws Exception {
            mockMvc.perform(get("/auth/threads"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", stubThreadsService.authUrl));
        }
    }

    @Nested
    @DisplayName("GET /auth/threads/callback - Xử lý callback từ Threads")
    class CallbackTests {

        @Test
        @DisplayName("TC-API-002: User bấm Từ chối cấp quyền (error != null)")
        void shouldRedirectToLoginWhenUserDeniesAccess() throws Exception {
            mockMvc.perform(get("/auth/threads/callback")
                            .param("error", "access_denied")
                            .param("error_description", "User denied access"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "http://localhost:5173/login?error=access_denied"));
        }

        @Test
        @DisplayName("TC-API-003: Không có mã authorization code (code trống)")
        void shouldRedirectToLoginWhenCodeIsMissing() throws Exception {
            mockMvc.perform(get("/auth/threads/callback"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "http://localhost:5173/login?error=no_code"));
        }

        @Test
        @DisplayName("TC-API-004: Đăng nhập thành công và user ACTIVE")
        void shouldLoginSuccessfullyWhenCodeIsValidAndUserActive() throws Exception {
            String code = "valid_auth_code_123";

            ObjectNode tokenNode = objectMapper.createObjectNode();
            tokenNode.put("access_token", "TH_ACCESS_TOKEN_ABC");
            tokenNode.put("user_id", "threads_user_999");
            stubThreadsService.tokenNode = tokenNode;

            ObjectNode userNode = objectMapper.createObjectNode();
            userNode.put("username", "testuser");
            userNode.put("name", "Test User");
            userNode.put("threads_profile_picture_url", "https://img.threads.net/avatar.jpg");
            stubThreadsService.userNode = userNode;

            stubUserService.syncedUser = User.builder()
                    .threadsUserId("threads_user_999")
                    .username("testuser")
                    .name("Test User")
                    .profilePictureUrl("https://img.threads.net/avatar.jpg")
                    .role(User.Role.USER)
                    .status(User.UserStatus.ACTIVE)
                    .build();

            mockMvc.perform(get("/auth/threads/callback").param("code", code))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "http://localhost:5173/"))
                    .andExpect(request().sessionAttribute("threads_user_id", "threads_user_999"))
                    .andExpect(request().sessionAttribute("threads_username", "testuser"))
                    .andExpect(request().sessionAttribute("user_status", "ACTIVE"));
        }

        @Test
        @DisplayName("TC-API-005: Đăng nhập nhưng tài khoản đã bị khóa (BLOCKED)")
        void shouldRedirectWithErrorWhenAccountIsBlocked() throws Exception {
            String code = "valid_auth_code_blocked";

            ObjectNode tokenNode = objectMapper.createObjectNode();
            tokenNode.put("access_token", "TH_TOKEN_BLOCKED");
            tokenNode.put("user_id", "threads_user_blocked");
            stubThreadsService.tokenNode = tokenNode;

            ObjectNode userNode = objectMapper.createObjectNode();
            userNode.put("username", "blockeduser");
            userNode.put("name", "Blocked User");
            stubThreadsService.userNode = userNode;

            stubUserService.syncedUser = User.builder()
                    .threadsUserId("threads_user_blocked")
                    .role(User.Role.USER)
                    .status(User.UserStatus.BLOCKED)
                    .build();

            mockMvc.perform(get("/auth/threads/callback").param("code", code))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "http://localhost:5173/login?error=account_blocked"));
        }

        @Test
        @DisplayName("TC-API-006: Gặp lỗi ngoại lệ khi trao đổi token với Meta")
        void shouldHandleExceptionWhenOAuthFails() throws Exception {
            stubThreadsService.throwExceptionOnExchange = true;

            mockMvc.perform(get("/auth/threads/callback").param("code", "invalid_code"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "http://localhost:5173/login?error=oauth_failed"));
        }
    }

    @Nested
    @DisplayName("GET /api/auth/me - Lấy thông tin user hiện tại")
    class GetCurrentUserTests {

        @Test
        @DisplayName("TC-API-007: Chưa đăng nhập -> Trả về HTTP 401 Unauthorized")
        void shouldReturnUnauthorizedWhenNoSession() throws Exception {
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.authenticated").value(false));
        }

        @Test
        @DisplayName("TC-API-008: Đã đăng nhập và tài khoản ACTIVE -> Trả về HTTP 200")
        void shouldReturnUserInfoWhenAuthenticatedAndActive() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "12345");
            session.setAttribute("threads_username", "johndoe");
            session.setAttribute("threads_name", "John Doe");
            session.setAttribute("threads_profile_picture", "https://img.com/avatar.png");

            stubUserService.foundUser = Optional.of(User.builder()
                    .threadsUserId("12345")
                    .role(User.Role.USER)
                    .status(User.UserStatus.ACTIVE)
                    .build());

            mockMvc.perform(get("/api/auth/me").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.authenticated").value(true))
                    .andExpect(jsonPath("$.id").value("12345"))
                    .andExpect(jsonPath("$.username").value("johndoe"))
                    .andExpect(jsonPath("$.role").value("USER"))
                    .andExpect(jsonPath("$.status").value("ACTIVE"));
        }

        @Test
        @DisplayName("TC-API-009: Đã đăng nhập nhưng tài khoản bị quản trị viên khóa -> HTTP 403 Forbidden")
        void shouldReturnForbiddenWhenUserIsBlocked() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "12345");

            stubUserService.foundUser = Optional.of(User.builder()
                    .threadsUserId("12345")
                    .role(User.Role.USER)
                    .status(User.UserStatus.BLOCKED)
                    .build());

            mockMvc.perform(get("/api/auth/me").session(session))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.authenticated").value(false))
                    .andExpect(jsonPath("$.error").value("Tài khoản của bạn đã bị khóa bởi Quản trị viên."));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/logout - Đăng xuất")
    class LogoutTests {

        @Test
        @DisplayName("TC-API-010: Đăng xuất hủy session và trả về 200 OK")
        void shouldInvalidateSessionAndReturnSuccess() throws Exception {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("threads_user_id", "12345");

            mockMvc.perform(post("/api/auth/logout").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }
}
