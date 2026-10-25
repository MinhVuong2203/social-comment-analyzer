package com.social.backend.dto;

public record PostDto(
        String id,
        String text,
        String permalink,
        String mediaType,
        String timestamp,
        int totalReplies,
        boolean analyzed
) {}
