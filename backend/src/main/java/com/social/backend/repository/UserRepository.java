package com.social.backend.repository;

import com.social.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByThreadsUserId(String threadsUserId);
    Optional<User> findByUsername(String username);
    long countByStatus(User.UserStatus status);
}
