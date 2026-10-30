package com.social.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.dto.*;
import com.social.backend.entity.*;
import com.social.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
     * 1. Lấy bình luận từ Threads API
     * 2. Gọi AI Service suy luận batch cả 3 tác vụ
     * 3. Lưu Post, Comments, Predictions và AnalysisResult vào DB
     * 4. Trả về kết quả phân tích đầy đủ
     */
    @Transactional
    public PostAnalysisResponse analyzePost(String postId, String threadsUserId, String accessToken) {
        // 1. Thu thập danh sách bình luận (từ Threads API hoặc từ DB nếu đã fetch)
        List<Comment> commentsToAnalyze = new ArrayList<>();

        if (accessToken != null && !accessToken.isBlank()) {
            try {
                JsonNode repliesNode = threadsOAuthService.getPostReplies(postId, accessToken);
                if (repliesNode != null && repliesNode.has("data") && repliesNode.get("data").isArray()) {
                    for (JsonNode item : repliesNode.get("data")) {
                        String commentId = item.path("id").asText();
                        String username = item.path("username").asText("threads_user");
                        String text = item.path("text").asText("");
                        String timestamp = item.path("timestamp").asText("");

                        Comment comment = commentRepository.findByThreadsCommentId(commentId)
                                .orElseGet(() -> Comment.builder()
                                        .threadsCommentId(commentId)
                                        .threadsPostId(postId)
                                        .username(username)
                                        .text(text)
                                        .threadsTimestamp(timestamp)
                                        .build());

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
                    new CommentAnalysisDto.TaskSummary(sentLabel, sentConf)
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
                        p != null ? new CommentAnalysisDto.TaskSummary(p.getSentimentLabel(), p.getSentimentConfidence()) : null
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
     * Thống kê toàn hệ thống cho Quản trị viên
     */
    public AdminDto.SystemStats getAdminStatistics() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(User.UserStatus.ACTIVE);
        long blockedUsers = userRepository.countByStatus(User.UserStatus.BLOCKED);

        List<AnalysisResult> allResults = analysisResultRepository.findAll();
        long totalPosts = allResults.size();
        long totalComments = 0;
        long toxic = 0, nonToxic = 0;
        long clean = 0, offensive = 0, hate = 0;
        long positive = 0, neutral = 0, negative = 0;

        for (AnalysisResult ar : allResults) {
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
                negative
        );
    }
}
