package com.social.backend.controller;

import com.social.backend.dto.AdminDto;
import com.social.backend.entity.User;
import com.social.backend.service.AnalysisService;
import com.social.backend.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final AnalysisService analysisService;

    @Value("${admin.username:admin}")
    private String configuredAdminUsername;

    @Value("${admin.password:admin123}")
    private String configuredAdminPassword;

    public AdminController(UserService userService, AnalysisService analysisService) {
        this.userService = userService;
        this.analysisService = analysisService;
    }

    /**
     * Đăng nhập cổng quản trị viên
     * POST /api/admin/auth/login
     */
    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> adminLogin(
            @RequestBody AdminDto.LoginRequest request,
            HttpSession session
    ) {
        if (request == null || request.username() == null || request.password() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin đăng nhập");
        }

        boolean isValid = (configuredAdminUsername.equals(request.username()) || "admin@social.local".equals(request.username()))
                && configuredAdminPassword.equals(request.password());

        if (!isValid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản hoặc mật khẩu quản trị không chính xác");
        }

        session.setAttribute("admin_logged_in", true);
        session.setAttribute("admin_username", request.username());
        session.setAttribute("admin_role", "SUPER_ADMIN");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "username", request.username(),
                "role", "SUPER_ADMIN"
        ));
    }

    /**
     * Đăng xuất cổng quản trị viên
     * POST /api/admin/auth/logout
     */
    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, Object>> adminLogout(HttpSession session) {
        session.removeAttribute("admin_logged_in");
        session.removeAttribute("admin_username");
        session.removeAttribute("admin_role");
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Lấy thông tin quản trị viên hiện tại
     * GET /api/admin/auth/me
     */
    @GetMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> getAdminMe(HttpSession session) {
        Boolean isLoggedIn = (Boolean) session.getAttribute("admin_logged_in");
        if (isLoggedIn == null || !isLoggedIn) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Quản trị viên chưa đăng nhập");
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "username", session.getAttribute("admin_username"),
                "role", session.getAttribute("admin_role")
        ));
    }

    /**
     * Xem danh sách người dùng extension
     * GET /api/admin/users
     */
    @GetMapping("/users")
    public ResponseEntity<List<AdminDto.UserSummary>> getAdminUsers(HttpSession session) {
        validateAdmin(session);
        return ResponseEntity.ok(userService.getAllUsersForAdmin());
    }

    /**
     * Xem chi tiết 1 người dùng
     * GET /api/admin/users/{id}
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id, HttpSession session) {
        validateAdmin(session);
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
    }

    /**
     * Khóa hoặc mở khóa người dùng
     * PATCH /api/admin/users/{id}/status
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<User> updateUserStatus(
            @PathVariable Long id,
            @RequestBody AdminDto.StatusUpdateRequest request,
            HttpSession session
    ) {
        validateAdmin(session);
        if (request == null || request.status() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu trạng thái cập nhật (ACTIVE/BLOCKED)");
        }

        try {
            User updated = userService.updateUserStatus(id, request.status());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * Xem thống kê toàn hệ thống
     * GET /api/admin/statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<AdminDto.SystemStats> getAdminStatistics(HttpSession session) {
        validateAdmin(session);
        return ResponseEntity.ok(analysisService.getAdminStatistics());
    }

    private void validateAdmin(HttpSession session) {
        Boolean isLoggedIn = (Boolean) session.getAttribute("admin_logged_in");
        if (isLoggedIn == null || !isLoggedIn) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu quyền Quản trị viên");
        }
    }
}
