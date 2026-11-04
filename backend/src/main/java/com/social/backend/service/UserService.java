package com.social.backend.service;

import com.social.backend.dto.AdminDto;
import com.social.backend.entity.User;
import com.social.backend.repository.AnalysisResultRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final JdbcTemplate jdbcTemplate;

    public UserService(
            UserRepository userRepository,
            PostRepository postRepository,
            AnalysisResultRepository analysisResultRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.analysisResultRepository = analysisResultRepository;
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
}
