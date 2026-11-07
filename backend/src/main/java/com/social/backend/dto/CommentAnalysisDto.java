package com.social.backend.dto;

public record CommentAnalysisDto(
        String id,
        String text,
        String username,
        String timestamp,
        TaskSummary toxicity,
        TaskSummary hateSpeech,
        TaskSummary sentiment,
        String parentId,
        Boolean isReply
) {
    public CommentAnalysisDto(
            String id,
            String text,
            String username,
            String timestamp,
            TaskSummary toxicity,
            TaskSummary hateSpeech,
            TaskSummary sentiment
    ) {
        this(id, text, username, timestamp, toxicity, hateSpeech, sentiment, null, false);
    }

    public record TaskSummary(
            String label,
            double confidence
    ) {}
}
