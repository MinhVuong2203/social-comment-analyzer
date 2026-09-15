package com.social.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.social.backend.service.ThreadsService;

@RestController
@RequestMapping("/api/threads")
public class ThreadsController {

    private final ThreadsService threadsService;


    public ThreadsController(
            ThreadsService threadsService
    ) {

        this.threadsService = threadsService;
    }


    /**
     * Test lấy comment từ Threads
     *
     * GET /api/threads/comments
     */
    @GetMapping("/comments")
    public String getComments() {

        threadsService.getConversation();

        return "Đã gọi Threads API. Kiểm tra Console.";
    }
}