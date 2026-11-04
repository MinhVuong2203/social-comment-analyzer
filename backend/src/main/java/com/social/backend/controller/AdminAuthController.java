package com.social.backend.controller;

import com.social.backend.dto.AdminLoginRequest;
import com.social.backend.dto.AdminResponse;
import com.social.backend.service.AdminAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAuthController {

    public static final String ADMIN_SESSION_KEY = "ADMIN_USER";

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            AdminResponse adminResponse = adminAuthService.login(request);

            // Lưu thông tin admin vào session (hỗ trợ cả 2 chuẩn session key)
            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(ADMIN_SESSION_KEY, adminResponse);
            session.setAttribute("admin_logged_in", true);
            session.setAttribute("admin_username", adminResponse.getUsername());
            session.setAttribute("admin_role", adminResponse.getRole());

            return ResponseEntity.ok(adminResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Collections.singletonMap("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("message", "Có lỗi xảy ra trên máy chủ. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentAdmin(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("message", "Chưa đăng nhập quản trị viên."));
        }

        AdminResponse admin = (AdminResponse) session.getAttribute(ADMIN_SESSION_KEY);
        if (admin == null) {
            // Kiểm tra fallback admin_username
            String username = (String) session.getAttribute("admin_username");
            if (username != null) {
                admin = AdminResponse.builder()
                        .username(username)
                        .role((String) session.getAttribute("admin_role"))
                        .build();
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Collections.singletonMap("message", "Chưa đăng nhập quản trị viên."));
            }
        }

        return ResponseEntity.ok(admin);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.removeAttribute(ADMIN_SESSION_KEY);
            session.removeAttribute("admin_logged_in");
            session.removeAttribute("admin_username");
            session.removeAttribute("admin_role");
            session.invalidate();
        }
        return ResponseEntity.ok(Collections.singletonMap("message", "Đã đăng xuất quản trị thành công."));
    }
}
