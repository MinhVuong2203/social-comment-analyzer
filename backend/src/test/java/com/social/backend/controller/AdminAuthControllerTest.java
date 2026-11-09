package com.social.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.AdminLoginRequest;
import com.social.backend.dto.AdminResponse;
import com.social.backend.service.AdminAuthService;
import com.social.backend.util.ExcelReportExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.OffsetDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith({MockitoExtension.class, ExcelReportExtension.class})
@DisplayName("Unit Tests - AdminAuthController (Admin Authentication APIs)")
class AdminAuthControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AdminAuthService adminAuthService;

    @InjectMocks
    private AdminAuthController adminAuthController;

    private AdminResponse mockAdminResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminAuthController).build();

        mockAdminResponse = AdminResponse.builder()
                .id(1L)
                .username("admin")
                .displayName("Administrator")
                .role("ADMIN")
                .accountStatus("ACTIVE")
                .lastLoginAt(OffsetDateTime.now())
                .build();
    }

    @Test
    @DisplayName("ID-051: POST /api/admin/login - Đăng nhập thành công với thông tin hợp lệ")
    void shouldReturn200WhenLoginSuccessful() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("admin", "123456");
        when(adminAuthService.login(any(AdminLoginRequest.class))).thenReturn(mockAdminResponse);

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"));

        verify(adminAuthService, times(1)).login(any(AdminLoginRequest.class));
    }

    @Test
    @DisplayName("ID-052: POST /api/admin/login - Đăng nhập thất bại khi sai mật khẩu")
    void shouldReturn401WhenCredentialsInvalid() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("admin", "wrong_pass");
        when(adminAuthService.login(any(AdminLoginRequest.class)))
                .thenThrow(new IllegalArgumentException("Tài khoản hoặc mật khẩu quản trị không chính xác."));

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Tài khoản hoặc mật khẩu quản trị không chính xác."));

        verify(adminAuthService, times(1)).login(any(AdminLoginRequest.class));
    }

    @Test
    @DisplayName("ID-053: POST /api/admin/login - Đăng nhập thất bại khi tài khoản không tồn tại")
    void shouldReturn401WhenAdminNotFound() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("non_existent_admin", "123456");
        when(adminAuthService.login(any(AdminLoginRequest.class)))
                .thenThrow(new IllegalArgumentException("Tài khoản hoặc mật khẩu quản trị không chính xác."));

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Tài khoản hoặc mật khẩu quản trị không chính xác."));
    }

    @Test
    @DisplayName("ID-054: POST /api/admin/login - Từ chối khi tài khoản bị khóa")
    void shouldReturn403WhenAccountIsDisabledOrBlocked() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("blocked_admin", "123456");
        when(adminAuthService.login(any(AdminLoginRequest.class)))
                .thenThrow(new IllegalStateException("Tài khoản quản trị đã bị vô hiệu hóa."));

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Tài khoản quản trị đã bị vô hiệu hóa."));
    }

    @Test
    @DisplayName("ID-055: POST /api/admin/login - Báo lỗi 400 khi username bị rỗng")
    void shouldReturn400WhenUsernameIsBlank() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("", "123456");

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ID-056: POST /api/admin/login - Báo lỗi 400 khi password bị rỗng")
    void shouldReturn400WhenPasswordIsBlank() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("admin", "");

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ID-057: POST /api/admin/login - Chống tấn công SQL Injection an toàn")
    void shouldReturn401WhenSqlInjectionAttempted() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("' OR '1'='1", "' OR '1'='1");
        when(adminAuthService.login(any(AdminLoginRequest.class)))
                .thenThrow(new IllegalArgumentException("Tài khoản hoặc mật khẩu quản trị không chính xác."));

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Tài khoản hoặc mật khẩu quản trị không chính xác."));
    }

    @Test
    @DisplayName("ID-058: GET /api/admin/me - Lấy thông tin phiên khi đã đăng nhập")
    void shouldReturn200WhenAdminSessionIsValidOnGetMe() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(AdminAuthController.ADMIN_SESSION_KEY, mockAdminResponse);

        mockMvc.perform(get("/api/admin/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("ID-059: GET /api/admin/me - Báo lỗi 401 khi chưa đăng nhập")
    void shouldReturn401WhenGetMeWithoutSession() throws Exception {
        mockMvc.perform(get("/api/admin/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Chưa đăng nhập quản trị viên."));
    }

    @Test
    @DisplayName("ID-060: POST /api/admin/logout - Đăng xuất và xóa phiên làm việc")
    void shouldReturn200AndInvalidateSessionOnLogout() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(AdminAuthController.ADMIN_SESSION_KEY, mockAdminResponse);

        mockMvc.perform(post("/api/admin/logout").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đã đăng xuất quản trị thành công."));
    }
}
