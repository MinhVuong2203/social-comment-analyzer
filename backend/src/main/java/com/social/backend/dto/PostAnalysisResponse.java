package com.social.backend.dto;

import java.util.List;
import java.util.Map;

public record PostAnalysisResponse(
        String postId,
        int totalComments,
        Map<String, Integer> toxicity,
        Map<String, Integer> hateSpeech,
        Map<String, Integer> sentiment,
        List<CommentAnalysisDto> comments
) {}
