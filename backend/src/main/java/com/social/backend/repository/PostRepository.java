package com.social.backend.repository;

import com.social.backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Optional<Post> findByThreadsPostId(String threadsPostId);
    List<Post> findByThreadsUserIdOrderByCreatedAtDesc(String threadsUserId);
    long countByThreadsUserId(String threadsUserId);
}
