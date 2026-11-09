package com.social.backend.service;

import com.social.backend.dto.AdminDto;
import com.social.backend.entity.User;
import com.social.backend.repository.AnalysisResultRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - UserService (User Management Logic)")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private AnalysisResultRepository analysisResultRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private UserService userService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(1L)
                .threadsUserId("threads_123")
                .username("test_user")
                .name("Test User")
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Lock user: 1_DAY duration calculates blockedUntil correctly")
    void testLockUser_1Day() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime before = LocalDateTime.now().plusDays(1).minusMinutes(1);
        User result = userService.lockUser(1L, "1_DAY", "Spam");
        LocalDateTime after = LocalDateTime.now().plusDays(1).plusMinutes(1);

        assertEquals(User.UserStatus.BLOCKED, result.getStatus());
        assertEquals("Spam", result.getBlockReason());
        assertNotNull(result.getBlockedUntil());
        assertTrue(result.getBlockedUntil().isAfter(before) && result.getBlockedUntil().isBefore(after));
        verify(userRepository, times(1)).save(activeUser);
    }

    @Test
    @DisplayName("Lock user: 7_DAYS duration calculates blockedUntil correctly")
    void testLockUser_7Days() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime before = LocalDateTime.now().plusDays(7).minusMinutes(1);
        User result = userService.lockUser(1L, "7_DAYS", "Toxic");
        LocalDateTime after = LocalDateTime.now().plusDays(7).plusMinutes(1);

        assertEquals(User.UserStatus.BLOCKED, result.getStatus());
        assertEquals("Toxic", result.getBlockReason());
        assertTrue(result.getBlockedUntil().isAfter(before) && result.getBlockedUntil().isBefore(after));
    }

    @Test
    @DisplayName("Lock user: 30_DAYS duration calculates blockedUntil correctly")
    void testLockUser_30Days() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime before = LocalDateTime.now().plusDays(30).minusMinutes(1);
        User result = userService.lockUser(1L, "30_DAYS", null);
        LocalDateTime after = LocalDateTime.now().plusDays(30).plusMinutes(1);

        assertEquals(User.UserStatus.BLOCKED, result.getStatus());
        assertEquals("Vi phạm quy định", result.getBlockReason()); // Default fallback reason
        assertTrue(result.getBlockedUntil().isAfter(before) && result.getBlockedUntil().isBefore(after));
    }

    @Test
    @DisplayName("Lock user: PERMANENT sets blockedUntil 100 years into the future")
    void testLockUser_Permanent() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.lockUser(1L, "PERMANENT", "Nghiêm trọng");

        assertEquals(User.UserStatus.BLOCKED, result.getStatus());
        assertTrue(result.getBlockedUntil().isAfter(LocalDateTime.now().plusYears(99)));
    }

    @Test
    @DisplayName("Lock user throws IllegalArgumentException when user does not exist")
    void testLockUser_ThrowsExceptionWhenNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                userService.lockUser(999L, "1_DAY", "test"));

        assertTrue(ex.getMessage().contains("Không tìm thấy"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unlock user sets status to ACTIVE and clears blockedUntil and reason")
    void testUnlockUser_Success() {
        User blockedUser = User.builder()
                .id(2L)
                .username("blocked_user")
                .status(User.UserStatus.BLOCKED)
                .blockedUntil(LocalDateTime.now().plusDays(5))
                .blockReason("Spamming")
                .build();

        when(userRepository.findById(2L)).thenReturn(Optional.of(blockedUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.unlockUser(2L);

        assertEquals(User.UserStatus.ACTIVE, result.getStatus());
        assertNull(result.getBlockedUntil());
        assertNull(result.getBlockReason());
        verify(userRepository, times(1)).save(blockedUser);
    }

    @Test
    @DisplayName("getAllUsersForAdmin automatically treats expired block as ACTIVE in summary")
    void testGetAllUsersForAdmin_AutoUnblocksExpired() {
        User expiredBlockedUser = User.builder()
                .id(3L)
                .threadsUserId("threads_expired")
                .username("expired_user")
                .name("Expired User")
                .role(User.Role.USER)
                .status(User.UserStatus.BLOCKED)
                .blockedUntil(LocalDateTime.now().minusHours(2)) // Already expired
                .blockReason("Tạm khóa")
                .build();

        when(userRepository.findAll()).thenReturn(List.of(expiredBlockedUser));
        when(postRepository.countByThreadsUserId("threads_expired")).thenReturn(12L);

        List<AdminDto.UserSummary> summaries = userService.getAllUsersForAdmin();

        assertEquals(1, summaries.size());
        assertEquals("ACTIVE", summaries.get(0).status()); // Automatically recognized as ACTIVE
        assertEquals(12L, summaries.get(0).postsAnalyzedCount());
    }
}
