package com.social.backend.repository;

import com.social.backend.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    Optional<Comment> findByThreadsCommentId(String threadsCommentId);
    List<Comment> findByThreadsPostIdOrderByCreatedAtDesc(String threadsPostId);
    long countByThreadsPostId(String threadsPostId);
}
