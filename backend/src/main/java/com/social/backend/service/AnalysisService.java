package com.social.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.*;
import com.social.backend.entity.*;
import com.social.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AnalysisService {

    private final AiServiceClient aiServiceClient;
    private final ThreadsOAuthService threadsOAuthService;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PredictionRepository predictionRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AnalysisService(
            AiServiceClient aiServiceClient,
            ThreadsOAuthService threadsOAuthService,
            PostRepository postRepository,
            CommentRepository commentRepository,
            PredictionRepository predictionRepository,
            AnalysisResultRepository analysisResultRepository,
            UserRepository userRepository
    ) {
        this.aiServiceClient = aiServiceClient;
        this.threadsOAuthService = threadsOAuthService;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.predictionRepository = predictionRepository;
        this.analysisResultRepository = analysisResultRepository;
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper();
    }

    public AiDto.SinglePredictResponse predictSingle(String text) {
        return aiServiceClient.predict(text);
    }

    public AiDto.BatchPredictResponse predictBatch(List<AiDto.BatchCommentDto> comments) {
        return aiServiceClient.predictBatch(comments);
    }

    /**
     * Phân tích toàn bộ bình luận của một bài viết:
     * 1. Lấy toàn bộ bình luận + reply từ Threads API qua /conversation (fallback /replies)
     * 2. Gọi AI Service suy luận batch cả 3 tác vụ PhoBERT
     * 3. Lưu Post, Comments, Predictions và AnalysisResult vào DB
     * 4. Trả về kết quả phân tích đầy đủ kèm quan hệ cha-con
     */
    @Transactional
    public PostAnalysisResponse analyzePost(String postId, String threadsUserId, String accessToken) {
        // 1. Thu thập danh sách bình luận + replies
        List<Comment> commentsToAnalyze = new ArrayList<>();

        if (accessToken != null && !accessToken.isBlank()) {
            try {
                // Ưu tiên /conversation để lấy cả comment cấp 1 và replies
                JsonNode conversationNode = threadsOAuthService.getPostConversation(postId, accessToken);
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

                            if (repliedToId != null && !repliedToId.isBlank() && !repliedToId.equalsIgnoreCase(postId)) {
                                parentId = repliedToId;
                                isReply = true;
                            }
                        }

                        final String finalParentId = parentId;
                        final boolean finalIsReply = isReply;

                        Comment comment = commentRepository.findByThreadsCommentId(commentId)
                                .orElseGet(() -> Comment.builder()
                                        .threadsCommentId(commentId)
                                        .threadsPostId(postId)
                                        .parentId(finalParentId)
                                        .isReply(finalIsReply)
                                        .username(username)
                                        .text(text)
                                        .threadsTimestamp(timestamp)
                                        .build());

                        comment.setParentId(parentId);
                        comment.setIsReply(isReply);
                        comment.setText(text);
                        comment = commentRepository.save(comment);
                        commentsToAnalyze.add(comment);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        if (commentsToAnalyze.isEmpty()) {
            commentsToAnalyze.addAll(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc(postId));
        }

        final int totalCount = commentsToAnalyze.size();

        // Nếu bài viết chưa có comment nào
        if (totalCount == 0) {
            return new PostAnalysisResponse(
                    postId,
                    0,
                    Map.of("NON-TOXIC", 0, "TOXIC", 0),
                    Map.of("CLEAN", 0, "OFFENSIVE", 0, "HATE", 0),
                    Map.of("POSITIVE", 0, "NEUTRAL", 0, "NEGATIVE", 0),
                    Collections.emptyList()
            );
        }

        // 2. Chuẩn bị batch input cho FastAPI AI Service
        List<AiDto.BatchCommentDto> batchInput = commentsToAnalyze.stream()
                .map(c -> new AiDto.BatchCommentDto(c.getThreadsCommentId(), c.getText()))
                .toList();

        AiDto.BatchPredictResponse aiResponse = aiServiceClient.predictBatch(batchInput);

        // 3. Thống kê và lưu Predictions
        int toxic = 0, nonToxic = 0;
        int clean = 0, offensive = 0, hate = 0;
        int positive = 0, neutral = 0, negative = 0;

        List<CommentAnalysisDto> commentDtos = new ArrayList<>();
        Map<String, AiDto.BatchCommentResultDto> resultMap = new HashMap<>();

        if (aiResponse != null && aiResponse.predictions() != null) {
            for (AiDto.BatchCommentResultDto item : aiResponse.predictions()) {
                resultMap.put(item.id(), item);
            }
        }

        for (Comment c : commentsToAnalyze) {
            AiDto.BatchCommentResultDto aiItem = resultMap.get(c.getThreadsCommentId());
            if (aiItem == null) continue;

            String toxLabel = aiItem.toxicity().label();
            double toxConf = aiItem.toxicity().confidence();
            if ("TOXIC".equalsIgnoreCase(toxLabel)) toxic++; else nonToxic++;

            String hateLabel = aiItem.hate_speech().label();
            double hateConf = aiItem.hate_speech().confidence();
            if ("HATE".equalsIgnoreCase(hateLabel)) hate++;
            else if ("OFFENSIVE".equalsIgnoreCase(hateLabel)) offensive++;
            else clean++;

            String sentLabel = aiItem.sentiment().label();
            double sentConf = aiItem.sentiment().confidence();
            if ("POSITIVE".equalsIgnoreCase(sentLabel)) positive++;
            else if ("NEGATIVE".equalsIgnoreCase(sentLabel)) negative++;
            else neutral++;

            String rawJson = "";
            try {
                rawJson = objectMapper.writeValueAsString(aiItem);
            } catch (Exception ignored) {}

            Prediction prediction = predictionRepository.findByThreadsCommentId(c.getThreadsCommentId())
                    .orElseGet(() -> Prediction.builder()
                            .threadsCommentId(c.getThreadsCommentId())
                            .threadsPostId(postId)
                            .build());

            prediction.setToxicityLabel(toxLabel);
            prediction.setToxicityConfidence(toxConf);
            prediction.setHateSpeechLabel(hateLabel);
            prediction.setHateSpeechConfidence(hateConf);
            prediction.setSentimentLabel(sentLabel);
            prediction.setSentimentConfidence(sentConf);
            prediction.setRawProbabilitiesJson(rawJson);

            predictionRepository.save(prediction);

            commentDtos.add(new CommentAnalysisDto(
                    c.getThreadsCommentId(),
                    c.getText(),
                    c.getUsername(),
                    c.getThreadsTimestamp(),
                    new CommentAnalysisDto.TaskSummary(toxLabel, toxConf),
                    new CommentAnalysisDto.TaskSummary(hateLabel, hateConf),
                    new CommentAnalysisDto.TaskSummary(sentLabel, sentConf),
                    c.getParentId(),
                    c.getIsReply() != null ? c.getIsReply() : false
            ));
        }

        // 4. Cập nhật trạng thái bài viết (Post)
        postRepository.findByThreadsPostId(postId).ifPresent(p -> {
            p.setAnalyzed(true);
            p.setTotalReplies(totalCount);
            postRepository.save(p);
        });

        // 5. Lưu AnalysisResult
        AnalysisResult analysisResult = AnalysisResult.builder()
                .threadsPostId(postId)
                .threadsUserId(threadsUserId)
                .totalComments(totalCount)
                .toxicCount(toxic)
                .nonToxicCount(nonToxic)
                .cleanCount(clean)
                .offensiveCount(offensive)
                .hateCount(hate)
                .positiveCount(positive)
                .neutralCount(neutral)
                .negativeCount(negative)
                .build();
        analysisResultRepository.save(analysisResult);

        return new PostAnalysisResponse(
                postId,
                commentsToAnalyze.size(),
                Map.of("NON-TOXIC", nonToxic, "TOXIC", toxic),
                Map.of("CLEAN", clean, "OFFENSIVE", offensive, "HATE", hate),
                Map.of("POSITIVE", positive, "NEUTRAL", neutral, "NEGATIVE", negative),
                commentDtos
        );
    }

    /**
     * Lấy kết quả phân tích đã lưu của 1 bài viết
     */
    public Optional<PostAnalysisResponse> getPostAnalysis(String postId) {
        return analysisResultRepository.findFirstByThreadsPostIdOrderByCreatedAtDesc(postId).map(ar -> {
            List<Comment> comments = commentRepository.findByThreadsPostIdOrderByCreatedAtDesc(postId);
            List<Prediction> predictions = predictionRepository.findByThreadsPostId(postId);

            Map<String, Prediction> predMap = new HashMap<>();
            for (Prediction p : predictions) {
                predMap.put(p.getThreadsCommentId(), p);
            }

            List<CommentAnalysisDto> commentDtos = comments.stream().map(c -> {
                Prediction p = predMap.get(c.getThreadsCommentId());
                return new CommentAnalysisDto(
                        c.getThreadsCommentId(),
                        c.getText(),
                        c.getUsername(),
                        c.getThreadsTimestamp(),
                        p != null ? new CommentAnalysisDto.TaskSummary(p.getToxicityLabel(), p.getToxicityConfidence()) : null,
                        p != null ? new CommentAnalysisDto.TaskSummary(p.getHateSpeechLabel(), p.getHateSpeechConfidence()) : null,
                        p != null ? new CommentAnalysisDto.TaskSummary(p.getSentimentLabel(), p.getSentimentConfidence()) : null,
                        c.getParentId(),
                        c.getIsReply() != null ? c.getIsReply() : false
                );
            }).toList();

            return new PostAnalysisResponse(
                    postId,
                    ar.getTotalComments(),
                    Map.of("NON-TOXIC", ar.getNonToxicCount(), "TOXIC", ar.getToxicCount()),
                    Map.of("CLEAN", ar.getCleanCount(), "OFFENSIVE", ar.getOffensiveCount(), "HATE", ar.getHateCount()),
                    Map.of("POSITIVE", ar.getPositiveCount(), "NEUTRAL", ar.getNeutralCount(), "NEGATIVE", ar.getNegativeCount()),
                    commentDtos
            );
        });
    }

    /**
     * Lịch sử phân tích của người dùng
     */
    public List<AnalysisResult> getAnalysisHistory(String threadsUserId) {
        return analysisResultRepository.findByThreadsUserIdOrderByCreatedAtDesc(threadsUserId);
    }

    /**
     * Thống kê tổng quan cho Dashboard người dùng
     */
    public OverviewResponse getOverview(String threadsUserId) {
        List<AnalysisResult> results = analysisResultRepository.findByThreadsUserIdOrderByCreatedAtDesc(threadsUserId);

        long totalComments = 0;
        long totalPosts = results.size();
        long toxic = 0, nonToxic = 0;
        long clean = 0, offensive = 0, hate = 0;
        long positive = 0, neutral = 0, negative = 0;

        for (AnalysisResult ar : results) {
            totalComments += ar.getTotalComments();
            toxic += ar.getToxicCount();
            nonToxic += ar.getNonToxicCount();
            clean += ar.getCleanCount();
            offensive += ar.getOffensiveCount();
            hate += ar.getHateCount();
            positive += ar.getPositiveCount();
            neutral += ar.getNeutralCount();
            negative += ar.getNegativeCount();
        }

        return new OverviewResponse(
                totalComments,
                totalPosts,
                Map.of("NON-TOXIC", nonToxic, "TOXIC", toxic),
                Map.of("CLEAN", clean, "OFFENSIVE", offensive, "HATE", hate),
                Map.of("POSITIVE", positive, "NEUTRAL", neutral, "NEGATIVE", negative)
        );
    }

    /**
     * Thống kê toàn hệ thống cho Quản trị viên (hỗ trợ lọc theo số ngày)
     */
    public AdminDto.SystemStats getAdminStatistics(Integer days) {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(User.UserStatus.ACTIVE);
        long blockedUsers = userRepository.countByStatus(User.UserStatus.BLOCKED);

        List<AnalysisResult> results;
        if (days != null && days > 0) {
            LocalDateTime since = LocalDateTime.now().minusDays(days);
            results = analysisResultRepository.findByCreatedAtGreaterThanEqual(since);
        } else {
            results = analysisResultRepository.findAll();
        }

        long totalPosts = results.size();
        long totalComments = 0;
        long toxic = 0, nonToxic = 0;
        long clean = 0, offensive = 0, hate = 0;
        long positive = 0, neutral = 0, negative = 0;

        for (AnalysisResult ar : results) {
            totalComments += (ar.getTotalComments() != null) ? ar.getTotalComments() : 0;
            toxic += (ar.getToxicCount() != null) ? ar.getToxicCount() : 0;
            nonToxic += (ar.getNonToxicCount() != null) ? ar.getNonToxicCount() : 0;
            clean += (ar.getCleanCount() != null) ? ar.getCleanCount() : 0;
            offensive += (ar.getOffensiveCount() != null) ? ar.getOffensiveCount() : 0;
            hate += (ar.getHateCount() != null) ? ar.getHateCount() : 0;
            positive += (ar.getPositiveCount() != null) ? ar.getPositiveCount() : 0;
            neutral += (ar.getNeutralCount() != null) ? ar.getNeutralCount() : 0;
            negative += (ar.getNegativeCount() != null) ? ar.getNegativeCount() : 0;
        }

        Double usersGrowthRate = null;
        Double commentsGrowthRate = null;
        Long newUsersCount = totalUsers;

        if (days != null && days > 0) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime currentStart = now.minusDays(days);
            LocalDateTime prevStart = now.minusDays(days * 2L);

            // Số lượng và tỷ lệ tăng trưởng User mới kỳ này so với kỳ trước
            long currentNewUsers = userRepository.countByCreatedAtGreaterThanEqual(currentStart);
            newUsersCount = currentNewUsers;
            long prevNewUsers = userRepository.countByCreatedAtBetween(prevStart, currentStart);
            if (prevNewUsers > 0) {
                usersGrowthRate = ((double) (currentNewUsers - prevNewUsers) / prevNewUsers) * 100.0;
            } else {
                usersGrowthRate = currentNewUsers > 0 ? 100.0 : 0.0;
            }

            // Tỷ lệ tăng trưởng số lượng comment phân tích PhoBERT so với kỳ trước
            List<AnalysisResult> prevResults = analysisResultRepository.findByCreatedAtBetween(prevStart, currentStart);
            long prevComments = 0;
            for (AnalysisResult ar : prevResults) {
                prevComments += (ar.getTotalComments() != null) ? ar.getTotalComments() : 0;
            }
            if (prevComments > 0) {
                commentsGrowthRate = ((double) (totalComments - prevComments) / prevComments) * 100.0;
            } else {
                commentsGrowthRate = totalComments > 0 ? 100.0 : 0.0;
            }
        }

        return new AdminDto.SystemStats(
                totalUsers,
                activeUsers,
                blockedUsers,
                totalPosts,
                totalComments,
                toxic,
                nonToxic,
                hate,
                clean,
                offensive,
                positive,
                neutral,
                negative,
                usersGrowthRate,
                commentsGrowthRate,
                newUsersCount
        );
    }

    public AdminDto.SystemStats getAdminStatistics() {
        return getAdminStatistics(null);
    }

    /**
     * Danh sách bài viết nóng có lượng bình luận độc hại / thù ghét cao nhất
     */
    public List<AdminDto.ToxicPostAlert> getTopToxicPosts(int limit) {
        List<AnalysisResult> results = analysisResultRepository.findAll();

        return results.stream()
                .filter(ar -> ar.getTotalComments() != null && ar.getTotalComments() > 0)
                .sorted((a, b) -> {
                    int toxicA = a.getToxicCount() != null ? a.getToxicCount() : 0;
                    int toxicB = b.getToxicCount() != null ? b.getToxicCount() : 0;
                    if (toxicB != toxicA) return Integer.compare(toxicB, toxicA);
                    int totA = a.getTotalComments() != null ? a.getTotalComments() : 1;
                    int totB = b.getTotalComments() != null ? b.getTotalComments() : 1;
                    double rateA = (double) toxicA / totA;
                    double rateB = (double) toxicB / totB;
                    return Double.compare(rateB, rateA);
                })
                .limit(limit > 0 ? limit : 5)
                .map(ar -> {
                    String postText = "";
                    String permalink = "";
                    Optional<Post> postOpt = postRepository.findByThreadsPostId(ar.getThreadsPostId());
                    if (postOpt.isPresent()) {
                        postText = postOpt.get().getText() != null ? postOpt.get().getText() : "";
                        permalink = postOpt.get().getPermalink() != null ? postOpt.get().getPermalink() : "";
                    }

                    String authorUsername = "";
                    if (ar.getThreadsUserId() != null) {
                        authorUsername = userRepository.findByThreadsUserId(ar.getThreadsUserId())
                                .map(u -> u.getUsername() != null ? u.getUsername() : u.getName())
                                .orElse(ar.getThreadsUserId());
                    }

                    int total = ar.getTotalComments() != null ? ar.getTotalComments() : 0;
                    int toxic = ar.getToxicCount() != null ? ar.getToxicCount() : 0;
                    int nonToxic = ar.getNonToxicCount() != null ? ar.getNonToxicCount() : 0;
                    int hate = ar.getHateCount() != null ? ar.getHateCount() : 0;
                    int offensive = ar.getOffensiveCount() != null ? ar.getOffensiveCount() : 0;
                    int negative = ar.getNegativeCount() != null ? ar.getNegativeCount() : 0;
                    int pct = total > 0 ? (int) Math.round((toxic * 100.0) / total) : 0;

                    String level = "LOW";
                    if (pct >= 60 || toxic >= 10) level = "CRITICAL";
                    else if (pct >= 35 || toxic >= 5) level = "HIGH";
                    else if (toxic > 0) level = "MEDIUM";

                    return new AdminDto.ToxicPostAlert(
                            ar.getId(),
                            ar.getThreadsPostId(),
                            ar.getThreadsUserId(),
                            authorUsername,
                            postText,
                            permalink,
                            total,
                            toxic,
                            nonToxic,
                            hate,
                            offensive,
                            negative,
                            pct,
                            level,
                            ar.getCreatedAt()
                    );
                })
                .toList();
    }
}
