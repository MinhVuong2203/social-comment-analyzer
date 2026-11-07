package com.social.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.social.backend.dto.CommentAnalysisDto;
import com.social.backend.dto.PostDto;
import com.social.backend.entity.Comment;
import com.social.backend.entity.Post;
import com.social.backend.entity.Prediction;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.PredictionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.*;

@Service
public class ThreadsPostService {

    private static final Logger log = LoggerFactory.getLogger(ThreadsPostService.class);

    private final ThreadsOAuthService threadsOAuthService;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PredictionRepository predictionRepository;

    public ThreadsPostService(
            ThreadsOAuthService threadsOAuthService,
            PostRepository postRepository,
            CommentRepository commentRepository,
            PredictionRepository predictionRepository
    ) {
        this.threadsOAuthService = threadsOAuthService;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.predictionRepository = predictionRepository;
    }

    /**
     * Lấy danh sách bài viết từ Threads API, đồng bộ vào Database và trả về DTO
     */
    @Transactional
    public List<PostDto> fetchAndSyncUserPosts(String threadsUserId, String accessToken) {
        try {
            JsonNode postsNode = threadsOAuthService.getUserPosts(accessToken);
            List<PostDto> postDtos = new ArrayList<>();

            if (postsNode != null && postsNode.has("data") && postsNode.get("data").isArray()) {
                for (JsonNode item : postsNode.get("data")) {
                    String postId = item.path("id").asText();
                    String text = item.path("text").asText("");
                    String permalink = item.path("permalink").asText("");
                    String mediaType = item.path("media_type").asText("TEXT_POST");
                    String timestamp = item.path("timestamp").asText("");

                    Optional<Post> existingPostOpt = postRepository.findByThreadsPostId(postId);
                    Post post;
                    if (existingPostOpt.isPresent()) {
                        post = existingPostOpt.get();
                        post.setText(text);
                        post.setPermalink(permalink);
                        post.setMediaType(mediaType);
                        post.setThreadsTimestamp(timestamp);
                    } else {
                        post = Post.builder()
                                .threadsPostId(postId)
                                .threadsUserId(threadsUserId)
                                .text(text)
                                .permalink(permalink)
                                .mediaType(mediaType)
                                .threadsTimestamp(timestamp)
                                .analyzed(false)
                                .totalReplies(0)
                                .build();
                    }
                    postRepository.save(post);

                    postDtos.add(new PostDto(
                            post.getThreadsPostId(),
                            post.getText(),
                            post.getPermalink(),
                            post.getMediaType(),
                            post.getThreadsTimestamp(),
                            post.getTotalReplies(),
                            post.getAnalyzed()
                    ));
                }
            }

            if (!postDtos.isEmpty()) {
                return postDtos;
            }
        } catch (Exception e) {
            // Nếu lỗi kết nối Threads (ví dụ token hết hạn hoặc dev proxy), fallback đọc từ Database
        }

        // Fallback đọc từ Database
        return postRepository.findByThreadsUserIdOrderByCreatedAtDesc(threadsUserId).stream()
                .map(p -> new PostDto(
                        p.getThreadsPostId(),
                        p.getText(),
                        p.getPermalink(),
                        p.getMediaType(),
                        p.getThreadsTimestamp(),
                        p.getTotalReplies(),
                        p.getAnalyzed()
                ))
                .toList();
    }

    public Optional<PostDto> getPostById(String postId) {
        return postRepository.findByThreadsPostId(postId)
                .map(p -> new PostDto(
                        p.getThreadsPostId(),
                        p.getText(),
                        p.getPermalink(),
                        p.getMediaType(),
                        p.getThreadsTimestamp(),
                        p.getTotalReplies(),
                        p.getAnalyzed()
                ));
    }

    /**
     * Lưu các reply mới từ Threads API vào Database.
     *
     * @return true nếu Threads trả về danh sách reply, false nếu không có token hoặc gọi API thất bại
     */
    @Transactional
    public boolean syncPostReplies(String postId, String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return false;
        }
        JsonNode repliesNode;
        try {
            repliesNode = threadsOAuthService.getPostReplies(postId, accessToken);
        } catch (HttpStatusCodeException e) {
            // Không log cả exception vì URL của request có chứa access token
            log.warn("Threads API từ chối lấy replies của bài {}: {} {}",
                    postId, e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.warn("Không gọi được Threads API để lấy replies của bài {}: {}", postId, e.getClass().getSimpleName());
            return false;
        }

        if (repliesNode == null || !repliesNode.path("data").isArray()) {
            log.warn("Threads API trả về dữ liệu replies không hợp lệ cho bài {}", postId);
            return false;
        }

        for (JsonNode item : repliesNode.get("data")) {
            String commentId = item.path("id").asText();
            if (commentRepository.findByThreadsCommentId(commentId).isEmpty()) {
                commentRepository.save(Comment.builder()
                        .threadsCommentId(commentId)
                        .threadsPostId(postId)
                        .username(item.path("username").asText("threads_user"))
                        .text(item.path("text").asText(""))
                        .threadsTimestamp(item.path("timestamp").asText(""))
                        .build());
            }
        }
        return true;
    }

    /**
     * Lấy bình luận từ Threads API hoặc Database, kèm theo kết quả AI (nếu đã phân tích)
     */
    @Transactional
    public List<CommentAnalysisDto> getPostCommentsWithAnalysis(String postId, String accessToken) {
        // Tiếp tục đọc từ DB nếu Threads API gặp sự cố
        syncPostReplies(postId, accessToken);

        // Lấy tất cả comments đã lưu cho postId
        List<Comment> comments = commentRepository.findByThreadsPostIdOrderByCreatedAtDesc(postId);
        List<Prediction> predictions = predictionRepository.findByThreadsPostId(postId);

        Map<String, Prediction> predictionMap = new HashMap<>();
        for (Prediction p : predictions) {
            predictionMap.put(p.getThreadsCommentId(), p);
        }

        List<CommentAnalysisDto> dtoList = new ArrayList<>();
        for (Comment c : comments) {
            Prediction p = predictionMap.get(c.getThreadsCommentId());
            CommentAnalysisDto.TaskSummary tox = null;
            CommentAnalysisDto.TaskSummary hate = null;
            CommentAnalysisDto.TaskSummary sent = null;

            if (p != null) {
                tox = new CommentAnalysisDto.TaskSummary(
                        p.getToxicityLabel() != null ? p.getToxicityLabel() : "UNKNOWN",
                        p.getToxicityConfidence() != null ? p.getToxicityConfidence() : 0.0
                );
                hate = new CommentAnalysisDto.TaskSummary(
                        p.getHateSpeechLabel() != null ? p.getHateSpeechLabel() : "UNKNOWN",
                        p.getHateSpeechConfidence() != null ? p.getHateSpeechConfidence() : 0.0
                );
                sent = new CommentAnalysisDto.TaskSummary(
                        p.getSentimentLabel() != null ? p.getSentimentLabel() : "UNKNOWN",
                        p.getSentimentConfidence() != null ? p.getSentimentConfidence() : 0.0
                );
            }

            dtoList.add(new CommentAnalysisDto(
                    c.getThreadsCommentId(),
                    c.getText(),
                    c.getUsername(),
                    c.getThreadsTimestamp(),
                    tox,
                    hate,
                    sent
            ));
        }

        return dtoList;
    }
}
