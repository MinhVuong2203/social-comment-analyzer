package com.social.backend.dto;

public record CommentAnalysisDto(
        String id,
        String text,
        String username,
        String timestamp,
        TaskSummary toxicity,
        TaskSummary hateSpeech,
        TaskSummary sentiment
) {
    public record TaskSummary(
            String label,
            double confidence
    ) {}
}
