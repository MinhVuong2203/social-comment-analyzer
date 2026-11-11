package com.social.backend.service;

import com.social.backend.dto.AdminLoginRequest;
import com.social.backend.dto.AdminResponse;
import com.social.backend.entity.Admin;
import com.social.backend.repository.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - AdminAuthService (Admin Business Logic)")
class AdminAuthServiceTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminAuthService adminAuthService;

    private Admin mockAdmin;

    @BeforeEach
    void setUp() {
        mockAdmin = Admin.builder()
                .id(1L)
                .username("admin")
                .passwordHash("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy")
                .displayName("Super Administrator")
                .role("SUPER_ADMIN")
                .accountStatus("ACTIVE")
                .createdAt(OffsetDateTime.now().minusDays(10))
                .updatedAt(OffsetDateTime.now().minusDays(10))
                .build();
    }

    @Test
    @DisplayName("Nghiệp vụ: Đăng nhập thành công, so khớp BCrypt và cập nhật lastLoginAt")
    void shouldLoginSuccessfullyAndUpdateLastLogin() {
        AdminLoginRequest request = new AdminLoginRequest("admin", "123456");

        when(adminRepository.findByUsername("admin")).thenReturn(Optional.of(mockAdmin));
        when(passwordEncoder.matches("123456", mockAdmin.getPasswordHash())).thenReturn(true);
        when(adminRepository.save(any(Admin.class))).thenReturn(mockAdmin);

        AdminResponse response = adminAuthService.login(request);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("admin", response.getUsername());
        assertEquals("SUPER_ADMIN", response.getRole());
        assertEquals("ACTIVE", response.getAccountStatus());
        assertNotNull(mockAdmin.getLastLoginAt());

        verify(adminRepository, times(1)).findByUsername("admin");
        verify(passwordEncoder, times(1)).matches("123456", mockAdmin.getPasswordHash());
        verify(adminRepository, times(1)).save(mockAdmin);
    }

    @Test
    @DisplayName("Nghiệp vụ: Ném IllegalArgumentException khi không tìm thấy admin")
    void shouldThrowExceptionWhenAdminNotFound() {
        AdminLoginRequest request = new AdminLoginRequest("unknown_admin", "123456");

        when(adminRepository.findByUsername("unknown_admin")).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            adminAuthService.login(request);
        });

        assertEquals("Tài khoản hoặc mật khẩu quản trị không chính xác.", exception.getMessage());
        verify(adminRepository, times(1)).findByUsername("unknown_admin");
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    @DisplayName("Nghiệp vụ: Ném IllegalArgumentException khi sai mật khẩu")
    void shouldThrowExceptionWhenPasswordDoesNotMatch() {
        AdminLoginRequest request = new AdminLoginRequest("admin", "wrong_password");

        when(adminRepository.findByUsername("admin")).thenReturn(Optional.of(mockAdmin));
        when(passwordEncoder.matches("wrong_password", mockAdmin.getPasswordHash())).thenReturn(false);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            adminAuthService.login(request);
        });

        assertEquals("Tài khoản hoặc mật khẩu quản trị không chính xác.", exception.getMessage());
        verify(adminRepository, never()).save(any(Admin.class));
    }

    @Test
    @DisplayName("Nghiệp vụ: Ném IllegalStateException khi tài khoản có status khác ACTIVE")
    void shouldThrowExceptionWhenAccountStatusIsNotActive() {
        mockAdmin.setAccountStatus("BLOCKED");
        AdminLoginRequest request = new AdminLoginRequest("admin", "123456");

        when(adminRepository.findByUsername("admin")).thenReturn(Optional.of(mockAdmin));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            adminAuthService.login(request);
        });

        assertEquals("Tài khoản quản trị đã bị vô hiệu hóa.", exception.getMessage());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(adminRepository, never()).save(any(Admin.class));
    }

    @Test
    @DisplayName("Nghiệp vụ: Tự động băm BCrypt khi phát hiện mật khẩu lưu dạng plain-text")
    void shouldAutoUpgradePlainTextPasswordToBCrypt() {
        mockAdmin.setPasswordHash("123456"); // Plain text trong DB
        AdminLoginRequest request = new AdminLoginRequest("admin", "123456");

        when(adminRepository.findByUsername("admin")).thenReturn(Optional.of(mockAdmin));
        when(passwordEncoder.matches("123456", "123456")).thenReturn(false);
        when(passwordEncoder.encode("123456")).thenReturn("$2a$10$hashed_bcrypt_secret");
        when(adminRepository.save(any(Admin.class))).thenReturn(mockAdmin);

        AdminResponse response = adminAuthService.login(request);

        assertNotNull(response);
        assertEquals("$2a$10$hashed_bcrypt_secret", mockAdmin.getPasswordHash());
        verify(passwordEncoder, times(1)).encode("123456");
        verify(adminRepository, times(1)).save(mockAdmin);
    }
}
