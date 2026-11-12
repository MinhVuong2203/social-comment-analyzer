package com.social.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CommentAnalysisDto(
        String id,
        String text,
        String username,
        String timestamp,
        TaskSummary toxicity,
        TaskSummary hateSpeech,
        TaskSummary sentiment,
        String parentId,
        Boolean isReply,
        @JsonProperty("profile_picture_url")
        String profilePictureUrl
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
        this(id, text, username, timestamp, toxicity, hateSpeech, sentiment, null, false, null);
    }

    public CommentAnalysisDto(
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
        this(id, text, username, timestamp, toxicity, hateSpeech, sentiment, parentId, isReply, null);
    }

    @JsonProperty("profilePictureUrl")
    public String profilePictureUrlCamel() {
        return profilePictureUrl;
    }

    public record TaskSummary(
            String label,
            double confidence
    ) {}
}
