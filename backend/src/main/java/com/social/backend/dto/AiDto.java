package com.social.backend.dto;

import java.util.Map;

public class AiDto {

    public record PredictRequest(
            String text
    ) {}

    public record BatchCommentDto(
            String id,
            String text
    ) {}

    public record BatchPredictRequest(
            java.util.List<BatchCommentDto> comments
    ) {}

    public record TaskPredictionDto(
            int label_id,
            String label,
            double confidence,
            Map<String, Double> probabilities
    ) {}

    public record SinglePredictResponse(
            String text,
            String processed_text,
            TaskPredictionDto toxicity,
            TaskPredictionDto hate_speech,
            TaskPredictionDto sentiment
    ) {}

    public record BatchCommentResultDto(
            String id,
            String text,
            String processed_text,
            TaskPredictionDto toxicity,
            TaskPredictionDto hate_speech,
            TaskPredictionDto sentiment
    ) {}

    public record BatchPredictResponse(
            int total,
            java.util.List<BatchCommentResultDto> predictions
    ) {}
}
