package com.social.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.AdminDto;
import com.social.backend.entity.User;
import com.social.backend.service.AnalysisService;
import com.social.backend.service.UserService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - AdminController (User Management APIs)")
class AdminUserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @Mock
    private AnalysisService analysisService;

    @InjectMocks
    private AdminController adminController;

    private ObjectMapper objectMapper;
    private MockHttpSession adminSession;
    private User sampleUser;
    private AdminDto.UserSummary sampleSummary;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminController).build();
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        adminSession = new MockHttpSession();
        adminSession.setAttribute("admin_logged_in", true);
        adminSession.setAttribute("admin_username", "admin");
        adminSession.setAttribute("admin_role", "SUPER_ADMIN");

        sampleUser = User.builder()
                .id(1L)
                .threadsUserId("threads_user_101")
                .username("john_doe")
                .name("John Doe")
                .profilePictureUrl("https://example.com/avatar.jpg")
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .createdAt(LocalDateTime.now().minusDays(10))
                .lastLoginAt(LocalDateTime.now())
                .build();

        sampleSummary = new AdminDto.UserSummary(
                1L,
                "threads_user_101",
                "john_doe",
                "John Doe",
                "https://example.com/avatar.jpg",
                "USER",
                "ACTIVE",
                null,
                null,
                LocalDateTime.now().minusDays(10),
                LocalDateTime.now(),
                5L
        );
    }

    @Test
    @DisplayName("ID-061: Lấy danh sách người dùng thành công khi có session Admin (200 OK)")
    void testGetUsers_Success_WhenAdminLoggedIn() throws Exception {
        when(userService.getAllUsersForAdmin()).thenReturn(List.of(sampleSummary));

        mockMvc.perform(get("/api/admin/users")
                        .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].username").value("john_doe"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].postsAnalyzedCount").value(5));

        verify(userService, times(1)).getAllUsersForAdmin();
    }

    @Test
    @DisplayName("ID-062: Lấy danh sách người dùng thất bại khi chưa đăng nhập Admin (401 Unauthorized)")
    void testGetUsers_Unauthorized_WhenNoAdminSession() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());

        verify(userService, never()).getAllUsersForAdmin();
    }

    @Test
    @DisplayName("ID-063: Lấy danh sách người dùng thành công với Header X-Admin-Auth (200 OK)")
    void testGetUsers_Success_WithAuthHeader() throws Exception {
        when(userService.getAllUsersForAdmin()).thenReturn(List.of(sampleSummary));

        mockMvc.perform(get("/api/admin/users")
                        .header("X-Admin-Auth", "secret_admin_token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].username").value("john_doe"));

        verify(userService, times(1)).getAllUsersForAdmin();
    }

    @Test
    @DisplayName("ID-064: Xem chi tiết người dùng tồn tại theo ID (200 OK)")
    void testGetUserById_Success() throws Exception {
        when(userService.findById(1L)).thenReturn(Optional.of(sampleUser));

        mockMvc.perform(get("/api/admin/users/1")
                        .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("john_doe"))
                .andExpect(jsonPath("$.threadsUserId").value("threads_user_101"));

        verify(userService, times(1)).findById(1L);
    }

    @Test
    @DisplayName("ID-065: Xem chi tiết người dùng khi ID không tồn tại (404 Not Found)")
    void testGetUserById_NotFound() throws Exception {
        when(userService.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/users/999")
                        .session(adminSession))
                .andExpect(status().isNotFound());

        verify(userService, times(1)).findById(999L);
    }

    @Test
    @DisplayName("ID-066: Khóa tài khoản người dùng thời hạn 1 ngày (1_DAY) kèm lý do (200 OK)")
    void testLockUser_Success_1Day() throws Exception {
        User blockedUser = User.builder()
                .id(1L)
                .username("john_doe")
                .status(User.UserStatus.BLOCKED)
                .blockedUntil(LocalDateTime.now().plusDays(1))
                .blockReason("Spam bình luận tiêu cực")
                .build();

        when(userService.lockUser(eq(1L), eq("1_DAY"), eq("Spam bình luận tiêu cực"))).thenReturn(blockedUser);

        AdminDto.UserLockRequest request = new AdminDto.UserLockRequest("1_DAY", "Spam bình luận tiêu cực");

        mockMvc.perform(post("/api/admin/users/1/lock")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("BLOCKED"))
                .andExpect(jsonPath("$.blockReason").value("Spam bình luận tiêu cực"));

        verify(userService, times(1)).lockUser(1L, "1_DAY", "Spam bình luận tiêu cực");
    }

    @Test
    @DisplayName("ID-067: Khóa tài khoản người dùng vĩnh viễn (PERMANENT) (200 OK)")
    void testLockUser_Success_Permanent() throws Exception {
        User permanentlyBlocked = User.builder()
                .id(1L)
                .username("john_doe")
                .status(User.UserStatus.BLOCKED)
                .blockedUntil(LocalDateTime.now().plusYears(100))
                .blockReason("Tấn công hệ thống")
                .build();

        when(userService.lockUser(eq(1L), eq("PERMANENT"), eq("Tấn công hệ thống"))).thenReturn(permanentlyBlocked);

        AdminDto.UserLockRequest request = new AdminDto.UserLockRequest("PERMANENT", "Tấn công hệ thống");

        mockMvc.perform(post("/api/admin/users/1/lock")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BLOCKED"))
                .andExpect(jsonPath("$.blockReason").value("Tấn công hệ thống"));

        verify(userService, times(1)).lockUser(1L, "PERMANENT", "Tấn công hệ thống");
    }

    @Test
    @DisplayName("ID-068: Khóa tài khoản thất bại khi user ID không tồn tại (400 Bad Request)")
    void testLockUser_NotFound() throws Exception {
        when(userService.lockUser(eq(999L), anyString(), any()))
                .thenThrow(new IllegalArgumentException("Không tìm thấy người dùng với ID: 999"));

        AdminDto.UserLockRequest request = new AdminDto.UserLockRequest("7_DAYS", "Vi phạm");

        mockMvc.perform(post("/api/admin/users/999/lock")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(userService, times(1)).lockUser(eq(999L), anyString(), any());
    }

    @Test
    @DisplayName("ID-069: Mở khóa tài khoản người dùng thành công (200 OK)")
    void testUnlockUser_Success() throws Exception {
        User unblockedUser = User.builder()
                .id(1L)
                .username("john_doe")
                .status(User.UserStatus.ACTIVE)
                .blockedUntil(null)
                .blockReason(null)
                .build();

        when(userService.unlockUser(1L)).thenReturn(unblockedUser);

        mockMvc.perform(post("/api/admin/users/1/unlock")
                        .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.blockedUntil").doesNotExist())
                .andExpect(jsonPath("$.blockReason").doesNotExist());

        verify(userService, times(1)).unlockUser(1L);
    }

    @Test
    @DisplayName("ID-070: Mở khóa tài khoản thất bại khi user ID không tồn tại (400 Bad Request)")
    void testUnlockUser_NotFound() throws Exception {
        when(userService.unlockUser(999L))
                .thenThrow(new IllegalArgumentException("Không tìm thấy người dùng với ID: 999"));

        mockMvc.perform(post("/api/admin/users/999/unlock")
                        .session(adminSession))
                .andExpect(status().isBadRequest());

        verify(userService, times(1)).unlockUser(999L);
    }

    @Test
    @DisplayName("ID-071: Gọi API khóa hoặc mở khóa khi không có quyền Admin (401 Unauthorized)")
    void testLockAndUnlock_Unauthorized_WhenNoSession() throws Exception {
        mockMvc.perform(post("/api/admin/users/1/lock"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/admin/users/1/unlock"))
                .andExpect(status().isUnauthorized());

        verify(userService, never()).lockUser(anyLong(), anyString(), any());
        verify(userService, never()).unlockUser(anyLong());
    }

    @Test
    @DisplayName("ID-072: Cập nhật trạng thái người dùng qua PATCH /api/admin/users/{id}/status (200 OK)")
    void testUpdateUserStatus_Success() throws Exception {
        User updatedUser = User.builder()
                .id(1L)
                .username("john_doe")
                .status(User.UserStatus.BLOCKED)
                .build();

        when(userService.updateUserStatus(1L, "BLOCKED")).thenReturn(updatedUser);

        AdminDto.StatusUpdateRequest request = new AdminDto.StatusUpdateRequest("BLOCKED");

        mockMvc.perform(patch("/api/admin/users/1/status")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BLOCKED"));

        verify(userService, times(1)).updateUserStatus(1L, "BLOCKED");
    }
}
