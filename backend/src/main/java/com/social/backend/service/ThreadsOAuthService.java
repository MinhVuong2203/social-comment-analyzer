package com.social.backend.service;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ThreadsOAuthService {

    @Value("${threads.thread-id}")
    private String threadId;

    @Value("${threads.thread-secret}")
    private String threadSecret;

    @Value("${threads.redirect-uri}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Tạo URL đăng nhập Threads
     */
    public String buildAuthorizationUrl() {

        String state = UUID.randomUUID().toString();

        String scope = "threads_basic,threads_read_replies";

        String url = "https://threads.net/oauth/authorize"
                + "?client_id=" + threadId
                + "&redirect_uri=" + encode(redirectUri)
                + "&scope=" + scope
                + "&response_type=code"
                + "&state=" + state;

        System.out.println("==============================");
        System.out.println("THREADS APP ID LENGTH: "
                + (threadId == null ? "NULL" : threadId.length()));

        System.out.println("THREADS APP ID: "
                + threadId);

        System.out.println("REDIRECT URI: "
                + redirectUri);

        System.out.println("OAUTH URL:");
        System.out.println(url);
        System.out.println("==============================");

        return url;
        }

    /**
     * Đổi authorization code -> access token
     */
    public JsonNode exchangeCodeForToken(String code) throws Exception {

        String url = "https://graph.threads.net/oauth/access_token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();

        body.add("client_id", threadId);
        body.add("client_secret", threadSecret);
        body.add("code", code);
        body.add("grant_type", "authorization_code");
        body.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> request =
                new HttpEntity<>(body, headers);

        ResponseEntity<String> response =
                restTemplate.exchange(
                        url,
                        HttpMethod.POST,
                        request,
                        String.class
                );

        System.out.println("TOKEN RESPONSE:");
        System.out.println(response.getBody());

        return objectMapper.readTree(response.getBody());
    }

    /**
     * Lấy thông tin tài khoản Threads
     */
    public JsonNode getMe(String accessToken) throws Exception {

        String url =
                "https://graph.threads.net/me"
                        + "?fields=id,username,name,threads_profile_picture_url"
                        + "&access_token=" + encode(accessToken);

        ResponseEntity<String> response =
                restTemplate.getForEntity(
                        url,
                        String.class
                );

        System.out.println("ME RESPONSE:");
        System.out.println(response.getBody());

        return objectMapper.readTree(response.getBody());
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(
                value,
                java.nio.charset.StandardCharsets.UTF_8
        );
    }
}