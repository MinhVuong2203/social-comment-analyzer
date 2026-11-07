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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ThreadsPostService {

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
     * Lấy bình luận + toàn bộ replies từ Threads API hoặc Database, kèm theo kết quả AI (nếu đã phân tích)
     */
    @Transactional
    public List<CommentAnalysisDto> getPostCommentsWithAnalysis(String postId, String accessToken) {
        // Đồng bộ bình luận & replies mới từ Threads API nếu có accessToken
        if (accessToken != null && !accessToken.isBlank()) {
            try {
                // 1. Ưu tiên gọi endpoint /conversation để lấy trọn vẹn cả bình luận cấp 1 + mọi replies con
                JsonNode conversationNode = threadsOAuthService.getPostConversation(postId, accessToken);

                // 2. Nếu /conversation không có dữ liệu, tự động fallback về endpoint /replies
                if (conversationNode == null || !conversationNode.has("data") || !conversationNode.get("data").isArray()) {
                    conversationNode = threadsOAuthService.getPostReplies(postId, accessToken);
                }

                if (conversationNode != null && conversationNode.has("data") && conversationNode.get("data").isArray()) {
                    for (JsonNode item : conversationNode.get("data")) {
                        String commentId = item.path("id").asText();
                        String username = item.path("username").asText("threads_user");
                        String text = item.path("text").asText("");
                        String timestamp = item.path("timestamp").asText("");

                        // Xử lý quan hệ phân cấp cha-con (replied_to)
                        String parentId = null;
                        boolean isReply = item.path("is_reply").asBoolean(false);

                        if (item.has("replied_to") && !item.get("replied_to").isNull()) {
                            JsonNode repliedToNode = item.get("replied_to");
                            String repliedToId = repliedToNode.isObject()
                                    ? repliedToNode.path("id").asText(null)
                                    : repliedToNode.asText(null);

                            // Nếu replied_to khác postId của bài gốc thì đây là reply của bình luận khác
                            if (repliedToId != null && !repliedToId.isBlank() && !repliedToId.equalsIgnoreCase(postId)) {
                                parentId = repliedToId;
                                isReply = true;
                            }
                        }

                        Optional<Comment> existingOpt = commentRepository.findByThreadsCommentId(commentId);
                        if (existingOpt.isEmpty()) {
                            Comment comment = Comment.builder()
                                    .threadsCommentId(commentId)
                                    .threadsPostId(postId)
                                    .parentId(parentId)
                                    .isReply(isReply)
                                    .username(username)
                                    .text(text)
                                    .threadsTimestamp(timestamp)
                                    .build();
                            commentRepository.save(comment);
                        } else {
                            Comment comment = existingOpt.get();
                            comment.setParentId(parentId);
                            comment.setIsReply(isReply);
                            comment.setText(text);
                            commentRepository.save(comment);
                        }
                    }
                }
            } catch (Exception ignored) {
                // Tiếp tục đọc từ DB nếu API gặp sự cố
            }
        }

        // Lấy tất cả comments và replies đã lưu cho postId
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
                    sent,
                    c.getParentId(),
                    c.getIsReply() != null ? c.getIsReply() : false
            ));
        }

        return dtoList;
    }
}
