package com.social.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ThreadsService {

    @Value("${threads.api.base-url}")
    private String baseUrl;

    @Value("${threads.access-token}")
    private String accessToken;

    @Value("${threads.thread-id}")
    private String threadId;

    private final ObjectMapper objectMapper;

    public ThreadsService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }


    /**
     * Lấy toàn bộ conversation của Thread
     */
    public void getConversation() {

        RestClient restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(
                        HttpHeaders.ACCEPT,
                        MediaType.APPLICATION_JSON_VALUE
                )
                .build();


        // Các field muốn lấy từ Threads API
        String fields =
                "id," +
                "text," +
                "username," +
                "timestamp," +
                "is_reply," +
                "root_post," +
                "replied_to," +
                "permalink";


        // Tạo URL
        String url = UriComponentsBuilder
                .fromPath("/" + threadId + "/conversation")
                .queryParam("fields", fields)
                .queryParam("reverse", "false")
                .build()
                .toUriString();


        System.out.println();
        System.out.println("========================================");
        System.out.println("        THREADS API - COMMENTS");
        System.out.println("========================================");

        System.out.println("Thread ID: " + threadId);
        System.out.println("URL      : " + url);

        System.out.println();


        try {

            // Gọi Threads API
            String response = restClient.get()
                    .uri(url)
                    .header(
                            HttpHeaders.AUTHORIZATION,
                            "Bearer " + accessToken
                    )
                    .retrieve()
                    .body(String.class);


            // Parse JSON
            JsonNode root =
                    objectMapper.readTree(response);


            JsonNode data =
                    root.get("data");


            // Không có dữ liệu
            if (data == null || !data.isArray()) {

                System.out.println(
                        "Không tìm thấy comment/reply."
                );

                return;
            }


            int count = 0;


            // Duyệt từng comment
            for (JsonNode comment : data) {

                count++;

                System.out.println(
                        "----------------------------------------"
                );

                System.out.println(
                        "COMMENT #" + count
                );


                // ID
                System.out.println(
                        "ID       : "
                                + getValue(
                                comment,
                                "id"
                        )
                );


                // Username
                System.out.println(
                        "Username : @"
                                + getValue(
                                comment,
                                "username"
                        )
                );


                // Nội dung
                System.out.println(
                        "Text     : "
                                + getValue(
                                comment,
                                "text"
                        )
                );


                // Thời gian
                System.out.println(
                        "Timestamp: "
                                + getValue(
                                comment,
                                "timestamp"
                        )
                );


                // Có phải reply không?
                System.out.println(
                        "Is Reply : "
                                + getValue(
                                comment,
                                "is_reply"
                        )
                );


                // Thread gốc
                if (comment.has("root_post")
                        && comment.get("root_post")
                        .has("id")) {

                    System.out.println(
                            "Root Post: "
                                    + comment
                                    .get("root_post")
                                    .get("id")
                                    .asText()
                    );
                }


                // Comment mà reply đang trả lời
                if (comment.has("replied_to")
                        && comment.get("replied_to")
                        .has("id")) {

                    System.out.println(
                            "Replied To: "
                                    + comment
                                    .get("replied_to")
                                    .get("id")
                                    .asText()
                    );
                }


                // Link comment
                System.out.println(
                        "Permalink: "
                                + getValue(
                                comment,
                                "permalink"
                        )
                );

                System.out.println();
            }


            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "TỔNG COMMENT/REPLY: " + count
            );

            System.out.println(
                    "========================================"
            );


        } catch (Exception e) {

            System.err.println();
            System.err.println(
                    "========================================"
            );

            System.err.println(
                    "LỖI GỌI THREADS API"
            );

            System.err.println(
                    "========================================"
            );

            e.printStackTrace();
        }
    }


    /**
     * Lấy giá trị field trong JSON
     */
    private String getValue(
            JsonNode node,
            String field
    ) {

        if (node.has(field)
                && !node.get(field).isNull()) {

            return node
                    .get(field)
                    .asText();
        }

        return "";
    }
}