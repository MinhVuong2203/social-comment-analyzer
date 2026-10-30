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

    public List<AdminDto.UserSummary> getAllUsersForAdmin() {
        List<User> users = userRepository.findAll();
        return users.stream().map(u -> {
            long analyzedCount = analysisResultRepository.countByThreadsUserId(u.getThreadsUserId());
            return new AdminDto.UserSummary(
                    u.getId(),
                    u.getThreadsUserId(),
                    u.getUsername(),
                    u.getName(),
                    u.getProfilePictureUrl(),
                    u.getRole().name(),
                    u.getStatus().name(),
                    u.getCreatedAt(),
                    u.getLastLoginAt(),
                    analyzedCount
            );
        }).toList();
    }

    @Transactional
    public User updateUserStatus(Long userId, String statusStr) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với id: " + userId));

        User.UserStatus status = User.UserStatus.valueOf(statusStr.toUpperCase());
        user.setStatus(status);
        return userRepository.save(user);
    }
}
