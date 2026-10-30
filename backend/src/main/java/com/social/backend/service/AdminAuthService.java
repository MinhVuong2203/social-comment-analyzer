package com.social.backend.service;

import com.social.backend.dto.AdminLoginRequest;
import com.social.backend.dto.AdminResponse;
import com.social.backend.entity.Admin;
import com.social.backend.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AdminResponse login(AdminLoginRequest request) {
        String username = request.getUsername().trim();

        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản hoặc mật khẩu quản trị không chính xác."));

        if (!"ACTIVE".equalsIgnoreCase(admin.getAccountStatus())) {
            throw new IllegalStateException("Tài khoản quản trị đã bị vô hiệu hóa.");
        }

        boolean matches = false;
        try {
            matches = passwordEncoder.matches(request.getPassword(), admin.getPasswordHash());
        } catch (Exception ignored) {
        }

        // Hỗ trợ nếu người dùng nhập/lưu mật khẩu thường trực tiếp trong DB (tự động nâng cấp băm BCrypt luôn)
        if (!matches && request.getPassword().equals(admin.getPasswordHash())) {
            matches = true;
            admin.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (!matches) {
            throw new IllegalArgumentException("Tài khoản hoặc mật khẩu quản trị không chính xác.");
        }

        // Cập nhật thời điểm đăng nhập gần nhất
        admin.setLastLoginAt(OffsetDateTime.now());
        adminRepository.save(admin);

        return AdminResponse.fromEntity(admin);
    }
}

