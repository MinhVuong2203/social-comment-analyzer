package com.social.backend.service;

import com.social.backend.entity.User;
import com.social.backend.entity.UserSubscription;
import com.social.backend.repository.AnalysisResultRepository;
import com.social.backend.repository.UserRepository;
import com.social.backend.repository.UserSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Dịch vụ kiểm tra giới hạn sử dụng cho người dùng thường (non-VIP).
 * - Giới hạn 3 lần phân tích bài viết/ngày
 * - Giới hạn 3 lần xuất báo cáo/ngày
 * Admin và VIP không bị giới hạn.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserLimitService {

    private static final int FREE_DAILY_ANALYZE_LIMIT = 3;
    private static final int FREE_DAILY_EXPORT_LIMIT = 3;

    private final UserRepository userRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Tạo bảng export_logs nếu chưa tồn tại
     */
    @PostConstruct
    public void initExportLogsTable() {
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS export_logs (" +
                "  id BIGSERIAL PRIMARY KEY," +
                "  threads_user_id VARCHAR(100) NOT NULL," +
                "  post_id VARCHAR(100)," +
                "  format VARCHAR(20)," +
                "  created_at TIMESTAMP NOT NULL DEFAULT NOW()" +
                ")"
            );
            log.info("Bảng export_logs đã sẵn sàng.");
        } catch (Exception e) {
            log.warn("Không thể tạo bảng export_logs: {}", e.getMessage());
        }
    }

    /**
     * Kiểm tra xem người dùng có phải VIP đang hoạt động không.
     * Admin luôn được coi là có toàn quyền.
     */
    public boolean isVipOrAdmin(String threadsUserId) {
        if (threadsUserId == null) return false;

        Optional<User> userOpt = userRepository.findByThreadsUserId(threadsUserId);
        if (userOpt.isEmpty()) return false;

        User user = userOpt.get();

        // Admin luôn có toàn quyền
        if (user.getRole() == User.Role.ADMIN) return true;

        // Kiểm tra VIP subscription
        return hasActiveVip(user);
    }

    /**
     * Kiểm tra VIP subscription còn hiệu lực.
     */
    public boolean hasActiveVip(User user) {
        try {
            // Tìm qua app_users ID
            Long appUserId = getAppUserId(user);
            OffsetDateTime now = OffsetDateTime.now();

            Optional<UserSubscription> activeSub = userSubscriptionRepository
                    .findFirstByUserIdAndStatusOrderByEndAtDesc(appUserId, "ACTIVE");

            if (activeSub.isEmpty() && !appUserId.equals(user.getId())) {
                activeSub = userSubscriptionRepository
                        .findFirstByUserIdAndStatusOrderByEndAtDesc(user.getId(), "ACTIVE");
            }

            if (activeSub.isPresent()) {
                UserSubscription sub = activeSub.get();
                return sub.getEndAt() == null || sub.getEndAt().isAfter(now);
            }
        } catch (Exception e) {
            log.debug("Lỗi kiểm tra VIP cho user {}: {}", user.getThreadsUserId(), e.getMessage());
        }
        return false;
    }

    /**
     * Đếm số lần phân tích bài viết của user trong ngày hôm nay.
     */
    public long countTodayAnalysis(String threadsUserId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        try {
            return analysisResultRepository.countByThreadsUserIdAndCreatedAtBetween(
                    threadsUserId, startOfDay, endOfDay);
        } catch (Exception e) {
            log.debug("Lỗi đếm analysis hôm nay: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Đếm số lần xuất báo cáo của user trong ngày hôm nay.
     */
    public long countTodayExports(String threadsUserId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM export_logs WHERE threads_user_id = ? AND created_at >= ?",
                    Long.class,
                    threadsUserId, startOfDay
            );
        } catch (Exception e) {
            // Nếu bảng chưa tồn tại, trả về 0
            log.debug("export_logs chưa tồn tại hoặc lỗi đếm: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Ghi log xuất báo cáo.
     */
    public void logExport(String threadsUserId, String postId, String format) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO export_logs (threads_user_id, post_id, format, created_at) VALUES (?, ?, ?, NOW())",
                    threadsUserId, postId, format
            );
        } catch (Exception e) {
            log.debug("Lỗi ghi export_log: {}", e.getMessage());
        }
    }

    /**
     * Kiểm tra xem user có thể phân tích thêm không (giới hạn 3 lần/ngày với non-VIP).
     */
    public boolean canAnalyze(String threadsUserId) {
        if (isVipOrAdmin(threadsUserId)) return true;
        return countTodayAnalysis(threadsUserId) < FREE_DAILY_ANALYZE_LIMIT;
    }

    /**
     * Kiểm tra xem user có thể xuất báo cáo không (giới hạn 3 lần/ngày với non-VIP).
     */
    public boolean canExport(String threadsUserId) {
        if (isVipOrAdmin(threadsUserId)) return true;
        return countTodayExports(threadsUserId) < FREE_DAILY_EXPORT_LIMIT;
    }

    /**
     * Lấy số lần phân tích còn lại trong ngày (-1 = không giới hạn).
     */
    public int remainingAnalysis(String threadsUserId) {
        if (isVipOrAdmin(threadsUserId)) return -1;
        long used = countTodayAnalysis(threadsUserId);
        return (int) Math.max(0, FREE_DAILY_ANALYZE_LIMIT - used);
    }

    /**
     * Lấy số lần xuất báo cáo còn lại trong ngày (-1 = không giới hạn).
     */
    public int remainingExports(String threadsUserId) {
        if (isVipOrAdmin(threadsUserId)) return -1;
        long used = countTodayExports(threadsUserId);
        return (int) Math.max(0, FREE_DAILY_EXPORT_LIMIT - used);
    }

    public int getDailyAnalyzeLimit() {
        return FREE_DAILY_ANALYZE_LIMIT;
    }

    public int getDailyExportLimit() {
        return FREE_DAILY_EXPORT_LIMIT;
    }

    private Long getAppUserId(User user) {
        try {
            String threadsUserId = user.getThreadsUserId() != null
                    ? user.getThreadsUserId() : "user_" + user.getId();
            var ids = jdbcTemplate.query(
                    "SELECT id FROM app_users WHERE threads_user_id = ?",
                    (rs, rowNum) -> rs.getLong("id"),
                    threadsUserId
            );
            if (!ids.isEmpty()) return ids.get(0);
        } catch (Exception ignored) {}
        return user.getId();
    }
}
