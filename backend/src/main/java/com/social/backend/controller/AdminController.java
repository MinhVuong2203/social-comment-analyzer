package com.social.backend.controller;

import com.social.backend.dto.AdminDto;
import com.social.backend.entity.User;
import com.social.backend.service.AnalysisService;
import com.social.backend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
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
        session.removeAttribute("ADMIN_USER");
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Lấy thông tin quản trị viên hiện tại
     * GET /api/admin/auth/me
     */
    @GetMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> getAdminMe(HttpServletRequest request, HttpSession session) {
        validateAdmin(request, session);

        String username = session != null ? (String) session.getAttribute("admin_username") : null;
        Object role = session != null ? session.getAttribute("admin_role") : null;

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "username", username != null ? username : "admin",
                "role", role != null ? role : "SUPER_ADMIN"
        ));
    }

    /**
     * Xem danh sách người dùng extension
     * GET /api/admin/users
     */
    @GetMapping("/users")
    public ResponseEntity<List<AdminDto.UserSummary>> getAdminUsers(HttpServletRequest request, HttpSession session) {
        validateAdmin(request, session);
        return ResponseEntity.ok(userService.getAllUsersForAdmin());
    }

    /**
     * Xem chi tiết 1 người dùng
     * GET /api/admin/users/{id}
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id, HttpServletRequest request, HttpSession session) {
        validateAdmin(request, session);
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
    }

    /**
     * Khóa tài khoản người dùng với các option thời hạn (1 ngày, 7 ngày, 30 ngày, vĩnh viễn)
     * POST /api/admin/users/{id}/lock
     */
    @PostMapping("/users/{id}/lock")
    public ResponseEntity<User> lockUser(
            @PathVariable Long id,
            @RequestBody(required = false) AdminDto.UserLockRequest request,
            HttpServletRequest httpRequest,
            HttpSession session
    ) {
        validateAdmin(httpRequest, session);
        String duration = (request != null) ? request.duration() : "PERMANENT";
        String reason = (request != null) ? request.reason() : null;

        try {
            User updated = userService.lockUser(id, duration, reason);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * Mở khóa tài khoản người dùng
     * POST /api/admin/users/{id}/unlock
     */
    @PostMapping("/users/{id}/unlock")
    public ResponseEntity<User> unlockUser(
            @PathVariable Long id,
            HttpServletRequest httpRequest,
            HttpSession session
    ) {
        validateAdmin(httpRequest, session);
        try {
            User updated = userService.unlockUser(id);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * Khóa hoặc mở khóa người dùng (Legacy endpoint)
     * PATCH /api/admin/users/{id}/status
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<User> updateUserStatus(
            @PathVariable Long id,
            @RequestBody AdminDto.StatusUpdateRequest request,
            HttpServletRequest httpRequest,
            HttpSession session
    ) {
        validateAdmin(httpRequest, session);
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
    public ResponseEntity<AdminDto.SystemStats> getAdminStatistics(HttpServletRequest httpRequest, HttpSession session) {
        validateAdmin(httpRequest, session);
        return ResponseEntity.ok(analysisService.getAdminStatistics());
    }

    private void validateAdmin(HttpServletRequest request, HttpSession session) {
        if (session != null) {
            boolean hasAdminSession = Boolean.TRUE.equals(session.getAttribute("admin_logged_in"))
                    || session.getAttribute("ADMIN_USER") != null;
            if (hasAdminSession) {
                return;
            }
        }

        String authHeader = request.getHeader("X-Admin-Auth");
        if (authHeader != null && !authHeader.isBlank()) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu quyền Quản trị viên");
    }
}
