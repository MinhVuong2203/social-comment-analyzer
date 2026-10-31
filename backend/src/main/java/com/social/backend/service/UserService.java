package com.social.backend.service;

import com.social.backend.dto.AdminDto;
import com.social.backend.entity.User;
import com.social.backend.repository.AnalysisResultRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final AnalysisResultRepository analysisResultRepository;

    public UserService(
            UserRepository userRepository,
            PostRepository postRepository,
            AnalysisResultRepository analysisResultRepository
    ) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.analysisResultRepository = analysisResultRepository;
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

        return userRepository.save(user);
    }

    public Optional<User> findByThreadsUserId(String threadsUserId) {
        return userRepository.findByThreadsUserId(threadsUserId);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public List<AdminDto.UserSummary> getAllUsersForAdmin() {
        List<User> users = userRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        return users.stream().map(u -> {
            // Tự động kiểm tra nếu đã hết hạn khóa thì mở lại
            if (u.getStatus() == User.UserStatus.BLOCKED && u.getBlockedUntil() != null && now.isAfter(u.getBlockedUntil())) {
                u.setStatus(User.UserStatus.ACTIVE);
                u.setBlockedUntil(null);
                u.setBlockReason(null);
                userRepository.save(u);
            }

            long analyzedCount = analysisResultRepository.countByThreadsUserId(u.getThreadsUserId());
            return new AdminDto.UserSummary(
                    u.getId(),
                    u.getThreadsUserId(),
                    u.getUsername(),
                    u.getName(),
                    u.getProfilePictureUrl(),
                    u.getRole().name(),
                    u.getStatus().name(),
                    u.getBlockedUntil(),
                    u.getBlockReason(),
                    u.getCreatedAt(),
                    u.getLastLoginAt(),
                    analyzedCount
            );
        }).toList();
    }

    @Transactional
    public User lockUser(Long userId, String duration, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với id: " + userId));

        LocalDateTime blockedUntil = null;
        if (duration != null) {
            String norm = duration.trim().toUpperCase();
            if (norm.contains("1_DAY") || norm.equals("1")) {
                blockedUntil = LocalDateTime.now().plusDays(1);
            } else if (norm.contains("7_DAY") || norm.equals("7")) {
                blockedUntil = LocalDateTime.now().plusDays(7);
            } else if (norm.contains("30_DAY") || norm.equals("30")) {
                blockedUntil = LocalDateTime.now().plusDays(30);
            }
            // "PERMANENT" hoặc khác giữ nguyên blockedUntil = null (khóa đến khi mở lại)
        }

        user.setStatus(User.UserStatus.BLOCKED);
        user.setBlockedUntil(blockedUntil);
        user.setBlockReason(reason != null && !reason.isBlank() ? reason.trim() : "Khóa bởi Quản trị viên");

        return userRepository.save(user);
    }

    @Transactional
    public User unlockUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với id: " + userId));

        user.setStatus(User.UserStatus.ACTIVE);
        user.setBlockedUntil(null);
        user.setBlockReason(null);

        return userRepository.save(user);
    }

    @Transactional
    public User updateUserStatus(Long userId, String statusStr) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với id: " + userId));

        User.UserStatus status = User.UserStatus.valueOf(statusStr.toUpperCase());
        user.setStatus(status);
        if (status == User.UserStatus.ACTIVE) {
            user.setBlockedUntil(null);
            user.setBlockReason(null);
        }
        return userRepository.save(user);
    }
}
