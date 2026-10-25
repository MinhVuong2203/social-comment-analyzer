package com.social.backend.service;

import com.social.backend.dto.AiDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AiServiceClient {

    private final RestClient client;

    public AiServiceClient(
            RestClient.Builder builder,
            @Value("${ai.service.base-url:http://localhost:8000}") String baseUrl
    ) {
        this.client = builder
                .baseUrl(baseUrl)
                .build();
    }

    public AiDto.SinglePredictResponse predict(String text) {
        return client.post()
                .uri("/predict")
                .body(new AiDto.PredictRequest(text))
                .retrieve()
                .body(AiDto.SinglePredictResponse.class);
    }

    public AiDto.BatchPredictResponse predictBatch(List<AiDto.BatchCommentDto> comments) {
        return client.post()
                .uri("/predict/batch")
                .body(new AiDto.BatchPredictRequest(comments))
                .retrieve()
                .body(AiDto.BatchPredictResponse.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> health() {
        return client.get()
                .uri("/health")
                .retrieve()
                .body(Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> models() {
        return client.get()
                .uri("/models")
                .retrieve()
                .body(Map.class);
    }
}
