package com.social.backend.service;

import com.social.backend.entity.AdminAuditLog;
import com.social.backend.repository.AdminAuditLogRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditLogService {

    private final AdminAuditLogRepository auditLogRepository;

    @PostConstruct
    public void initDefaultLogs() {
        try {
            if (auditLogRepository.count() == 0) {
                log.info("Khởi tạo nhật ký hoạt động quản trị mẫu ban đầu...");
                List<AdminAuditLog> sampleLogs = List.of(
                        AdminAuditLog.builder()
                                .adminUsername("admin")
                                .action("ADMIN_LOGIN")
                                .targetType("AUTH")
                                .targetId("admin")
                                .description("Đăng nhập thành công vào cổng quản trị viên")
                                .createdAt(LocalDateTime.now().minusHours(1))
                                .build(),
                        AdminAuditLog.builder()
                                .adminUsername("admin")
                                .action("TOGGLE_PLAN")
                                .targetType("VIP_PLAN")
                                .targetId("VIP_30_DAYS")
                                .description("Kích hoạt trạng thái hiển thị gói 'VIP 30 ngày'")
                                .createdAt(LocalDateTime.now().minusHours(3))
                                .build(),
                        AdminAuditLog.builder()
                                .adminUsername("admin")
                                .action("UNLOCK_USER")
                                .targetType("USER")
                                .targetId("tailscaleedu123")
                                .description("Mở khóa tài khoản @tailscaleedu123 sau khi hết thời hạn đình chỉ")
                                .createdAt(LocalDateTime.now().minusHours(6))
                                .build()
                );
                auditLogRepository.saveAll(sampleLogs);
                log.info("Đã tạo 3 nhật ký hoạt động mẫu.");
            }
        } catch (Exception e) {
            log.warn("Không thể khởi tạo nhật ký mẫu: {}", e.getMessage());
        }
    }

    @Transactional
    public AdminAuditLog log(String adminUsername, String action, String targetType, String targetId, String description) {
        try {
            AdminAuditLog logEntry = AdminAuditLog.builder()
                    .adminUsername(adminUsername != null ? adminUsername : "admin")
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .build();
            return auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("Lỗi khi ghi nhật ký hoạt động: {}", e.getMessage());
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLog> getRecentLogs(int limit) {
        List<AdminAuditLog> all = auditLogRepository.findAllByOrderByCreatedAtDesc();
        return all.stream().limit(limit > 0 ? limit : 5).toList();
    }
}
