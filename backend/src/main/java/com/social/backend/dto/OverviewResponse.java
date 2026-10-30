package com.social.backend.dto;

import java.util.Map;

public record OverviewResponse(
        long totalComments,
        long totalPostsAnalyzed,
        Map<String, Long> toxicity,
        Map<String, Long> hateSpeech,
        Map<String, Long> sentiment
) {}
