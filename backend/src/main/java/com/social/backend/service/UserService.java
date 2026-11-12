package com.social.backend.service;

import com.social.backend.dto.AdminDto;
import com.social.backend.entity.AdminAuditLog;
import com.social.backend.entity.AnalysisResult;
import com.social.backend.entity.PaymentTransaction;
import com.social.backend.entity.Post;
import com.social.backend.entity.User;
import com.social.backend.entity.UserSubscription;
import com.social.backend.repository.AdminAuditLogRepository;
import com.social.backend.repository.AnalysisResultRepository;
import com.social.backend.repository.PaymentTransactionRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.UserRepository;
import com.social.backend.repository.UserSubscriptionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final UserLimitService userLimitService;
    private final JdbcTemplate jdbcTemplate;

    public UserService(
            UserRepository userRepository,
            PostRepository postRepository,
            AnalysisResultRepository analysisResultRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this(userRepository, postRepository, analysisResultRepository, null, null, null, null, jdbcTemplate);
    }

    @Autowired
    public UserService(
            UserRepository userRepository,
            PostRepository postRepository,
            AnalysisResultRepository analysisResultRepository,
            UserSubscriptionRepository userSubscriptionRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            AdminAuditLogRepository adminAuditLogRepository,
            UserLimitService userLimitService,
            JdbcTemplate jdbcTemplate
    ) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.analysisResultRepository = analysisResultRepository;
        this.userSubscriptionRepository = userSubscriptionRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.adminAuditLogRepository = adminAuditLogRepository;
        this.userLimitService = userLimitService;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Tạo mới hoặc cập nhật thông tin người dùng từ Threads OAuth
     */
    @Transactional
    public User syncThreadsUser(String threadsUserId, String username, String name, String profilePictureUrl) {
        Optional<User> existingUserOpt = userRepository.findByThreadsUserId(threadsUserId);

        User user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            user.setUsername(username);
            user.setName(name);
            user.setProfilePictureUrl(profilePictureUrl);
            user.setLastLoginAt(LocalDateTime.now());
            
            // Tự động gỡ khóa nếu đã hết hạn
            if (user.getStatus() == User.UserStatus.BLOCKED && user.getBlockedUntil() != null && LocalDateTime.now().isAfter(user.getBlockedUntil())) {
                user.setStatus(User.UserStatus.ACTIVE);
                user.setBlockedUntil(null);
                user.setBlockReason(null);
            }
        } else {
            user = User.builder()
                    .threadsUserId(threadsUserId)
                    .username(username)
                    .name(name)
                    .profilePictureUrl(profilePictureUrl)
                    .role(User.Role.USER)
                    .status(User.UserStatus.ACTIVE)
                    .build();
        }

        User saved = userRepository.save(user);

        // Đồng bộ sang app_users để đáp ứng foreign key
        try {
            jdbcTemplate.update(
                    "INSERT INTO app_users (id, threads_user_id, account_status, created_at, updated_at) " +
                    "OVERRIDING SYSTEM VALUE VALUES (?, ?, 'ACTIVE', NOW(), NOW()) " +
                    "ON CONFLICT (threads_user_id) DO UPDATE SET updated_at = NOW()",
                    saved.getId(), saved.getThreadsUserId()
            );
        } catch (Exception e) {
            log.debug("Đồng bộ app_users trong syncThreadsUser: {}", e.getMessage());
        }

        return saved;
    }

    public Optional<User> findByThreadsUserId(String threadsUserId) {
        return userRepository.findByThreadsUserId(threadsUserId);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public User lockUser(Long userId, String duration, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime blockedUntil;
        if ("1_DAY".equalsIgnoreCase(duration)) {
            blockedUntil = now.plusDays(1);
        } else if ("7_DAYS".equalsIgnoreCase(duration)) {
            blockedUntil = now.plusDays(7);
        } else if ("30_DAYS".equalsIgnoreCase(duration)) {
            blockedUntil = now.plusDays(30);
        } else {
            // PERMANENT hoặc mặc định 100 năm
            blockedUntil = now.plusYears(100);
        }

        user.setStatus(User.UserStatus.BLOCKED);
        user.setBlockedUntil(blockedUntil);
        user.setBlockReason(reason != null && !reason.isBlank() ? reason : "Vi phạm quy định");
        return userRepository.save(user);
    }

    @Transactional
    public User unlockUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        user.setStatus(User.UserStatus.ACTIVE);
        user.setBlockedUntil(null);
        user.setBlockReason(null);
        return userRepository.save(user);
    }

    @Transactional
    public User updateUserStatus(Long userId, String statusStr) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        User.UserStatus status = User.UserStatus.valueOf(statusStr.toUpperCase());
        user.setStatus(status);
        if (status == User.UserStatus.ACTIVE) {
            user.setBlockedUntil(null);
            user.setBlockReason(null);
        } else if (status == User.UserStatus.BLOCKED && user.getBlockedUntil() == null) {
            user.setBlockedUntil(LocalDateTime.now().plusYears(100));
        }
        return userRepository.save(user);
    }

    public List<AdminDto.UserSummary> getAllUsersForAdmin() {
        List<User> users = userRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        return users.stream().map(u -> {
            // Tự động cập nhật nếu hết hạn khóa trong bộ nhớ
            boolean isBlocked = u.getStatus() == User.UserStatus.BLOCKED;
            if (isBlocked && u.getBlockedUntil() != null && now.isAfter(u.getBlockedUntil())) {
                isBlocked = false;
            }

            long postCount = postRepository.countByThreadsUserId(u.getThreadsUserId());

            return new AdminDto.UserSummary(
                    u.getId(),
                    u.getThreadsUserId(),
                    u.getUsername(),
                    u.getName(),
                    u.getProfilePictureUrl(),
                    u.getRole().name(),
                    isBlocked ? "BLOCKED" : "ACTIVE",
                    u.getBlockedUntil(),
                    u.getBlockReason(),
                    u.getCreatedAt(),
                    u.getLastLoginAt(),
                    postCount
            );
        }).toList();
    }

    /**
     * Tổng hợp dữ liệu chi tiết (Drill-down) hoạt động của 1 người dùng cho Admin
     */
    public AdminDto.UserActivityDrilldown getUserActivityDrilldown(Long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));

        LocalDateTime now = LocalDateTime.now();
        boolean isBlocked = u.getStatus() == User.UserStatus.BLOCKED;
        if (isBlocked && u.getBlockedUntil() != null && now.isAfter(u.getBlockedUntil())) {
            isBlocked = false;
        }

        String threadsUserId = u.getThreadsUserId();
        List<Post> posts = threadsUserId != null
                ? postRepository.findByThreadsUserIdOrderByCreatedAtDesc(threadsUserId)
                : List.of();
        List<AnalysisResult> analysisResults = threadsUserId != null
                ? analysisResultRepository.findByThreadsUserIdOrderByCreatedAtDesc(threadsUserId)
                : List.of();

        // Lấy kết quả phân tích mới nhất theo mỗi bài viết
        Map<String, AnalysisResult> latestAnalysisByPost = new LinkedHashMap<>();
        for (AnalysisResult ar : analysisResults) {
            if (ar.getThreadsPostId() != null) {
                latestAnalysisByPost.putIfAbsent(ar.getThreadsPostId(), ar);
            }
        }

        long totalCommentsAnalyzed = 0;
        long totalToxicComments = 0;
        long totalHateComments = 0;
        for (AnalysisResult ar : latestAnalysisByPost.values()) {
            totalCommentsAnalyzed += ar.getTotalComments() != null ? ar.getTotalComments() : 0;
            totalToxicComments += ar.getToxicCount() != null ? ar.getToxicCount() : 0;
            totalHateComments += ar.getHateCount() != null ? ar.getHateCount() : 0;
        }

        List<AdminDto.UserPostActivityItem> recentPosts = posts.stream()
                .limit(20)
                .map(p -> {
                    AnalysisResult ar = latestAnalysisByPost.get(p.getThreadsPostId());
                    int comments = ar != null && ar.getTotalComments() != null ? ar.getTotalComments() : 0;
                    int toxic = ar != null && ar.getToxicCount() != null ? ar.getToxicCount() : 0;
                    int hate = ar != null && ar.getHateCount() != null ? ar.getHateCount() : 0;
                    int offensive = ar != null && ar.getOffensiveCount() != null ? ar.getOffensiveCount() : 0;
                    int positive = ar != null && ar.getPositiveCount() != null ? ar.getPositiveCount() : 0;
                    int neutral = ar != null && ar.getNeutralCount() != null ? ar.getNeutralCount() : 0;
                    int negative = ar != null && ar.getNegativeCount() != null ? ar.getNegativeCount() : 0;
                    int toxicPct = comments > 0 ? (int) Math.round((toxic * 100.0) / comments) : 0;

                    return new AdminDto.UserPostActivityItem(
                            p.getThreadsPostId(),
                            p.getText(),
                            p.getPermalink(),
                            p.getTotalReplies(),
                            Boolean.TRUE.equals(p.getAnalyzed()) || ar != null,
                            p.getCreatedAt(),
                            ar != null ? ar.getCreatedAt() : null,
                            comments,
                            toxic,
                            hate,
                            offensive,
                            positive,
                            neutral,
                            negative,
                            toxicPct
                    );
                })
                .toList();

        // Lịch sử gói VIP & thanh toán (gộp cả user.getId() và app_users.id nếu khác)
        Long appUserId = userLimitService.getAppUserId(u);
        Map<Long, UserSubscription> subMap = new LinkedHashMap<>();
        for (UserSubscription s : userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(u.getId())) {
            subMap.put(s.getId(), s);
        }
        if (appUserId != null && !appUserId.equals(u.getId())) {
            for (UserSubscription s : userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(appUserId)) {
                subMap.putIfAbsent(s.getId(), s);
            }
        }
        List<AdminDto.UserSubscriptionHistoryItem> subscriptions = subMap.values().stream()
                .sorted(Comparator.comparing(UserSubscription::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(s -> new AdminDto.UserSubscriptionHistoryItem(
                        s.getId(),
                        s.getVipPlan() != null ? s.getVipPlan().getPlanCode() : null,
                        s.getVipPlan() != null ? s.getVipPlan().getPlanName() : "Gói #" + s.getVipPlanId(),
                        s.getStatus(),
                        s.getVipPlan() != null ? s.getVipPlan().getPrice() : null,
                        s.getVipPlan() != null ? s.getVipPlan().getDurationDays() : null,
                        s.getStartAt(),
                        s.getEndAt(),
                        s.getCreatedAt()
                ))
                .toList();

        Map<Long, PaymentTransaction> payMap = new LinkedHashMap<>();
        for (PaymentTransaction p : paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(u.getId())) {
            payMap.put(p.getId(), p);
        }
        if (appUserId != null && !appUserId.equals(u.getId())) {
            for (PaymentTransaction p : paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(appUserId)) {
                payMap.putIfAbsent(p.getId(), p);
            }
        }
        List<AdminDto.UserPaymentHistoryItem> payments = payMap.values().stream()
                .sorted(Comparator.comparing(PaymentTransaction::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(p -> new AdminDto.UserPaymentHistoryItem(
                        p.getId(),
                        p.getOrderCode(),
                        p.getPaymentProvider(),
                        p.getPaymentMethod(),
                        p.getAmount(),
                        p.getCurrency(),
                        p.getStatus(),
                        p.getPaidAt(),
                        p.getCreatedAt()
                ))
                .toList();

        double totalSpentVnd = payMap.values().stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()) && p.getAmount() != null)
                .map(PaymentTransaction::getAmount)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();

        // Nhật ký tác động của Admin liên quan tới user này
        String idStr = String.valueOf(u.getId());
        String uname = u.getUsername();
        List<AdminDto.UserAuditLogItem> auditLogs = adminAuditLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(logItem -> idStr.equals(logItem.getTargetId())
                        || (uname != null && uname.equalsIgnoreCase(logItem.getTargetId()))
                        || (uname != null && logItem.getDescription() != null && logItem.getDescription().contains("@" + uname)))
                .limit(20)
                .map(logItem -> new AdminDto.UserAuditLogItem(
                        logItem.getId(),
                        logItem.getAdminUsername(),
                        logItem.getAction(),
                        logItem.getTargetType(),
                        logItem.getTargetId(),
                        logItem.getDescription(),
                        logItem.getCreatedAt()
                ))
                .toList();

        boolean unlimited = threadsUserId != null && userLimitService.isVipOrAdmin(threadsUserId);
        long todayAnalysis = threadsUserId != null ? userLimitService.countTodayAnalysis(threadsUserId) : 0;
        long todayExports = threadsUserId != null ? userLimitService.countTodayExports(threadsUserId) : 0;
        int remainingAnalysis = threadsUserId != null ? userLimitService.remainingAnalysis(threadsUserId) : userLimitService.getDailyAnalyzeLimit();
        int remainingExports = threadsUserId != null ? userLimitService.remainingExports(threadsUserId) : userLimitService.getDailyExportLimit();

        AdminDto.UserSummary userSummary = new AdminDto.UserSummary(
                u.getId(),
                u.getThreadsUserId(),
                u.getUsername(),
                u.getName(),
                u.getProfilePictureUrl(),
                u.getRole().name(),
                isBlocked ? "BLOCKED" : "ACTIVE",
                u.getBlockedUntil(),
                u.getBlockReason(),
                u.getCreatedAt(),
                u.getLastLoginAt(),
                posts.size()
        );

        AdminDto.UserQuotaSummary quotaSummary = new AdminDto.UserQuotaSummary(
                unlimited,
                todayAnalysis,
                unlimited ? -1 : userLimitService.getDailyAnalyzeLimit(),
                remainingAnalysis,
                todayExports,
                unlimited ? -1 : userLimitService.getDailyExportLimit(),
                remainingExports,
                posts.size(),
                analysisResults.size(),
                totalCommentsAnalyzed,
                totalToxicComments,
                totalHateComments,
                totalSpentVnd
        );

        return new AdminDto.UserActivityDrilldown(
                userSummary,
                quotaSummary,
                recentPosts,
                subscriptions,
                payments,
                auditLogs
        );
    }
}
