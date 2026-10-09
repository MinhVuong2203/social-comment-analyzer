package com.social.backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatabaseTestController {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseTestController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/test-db")
    public String testDatabase() {
        String message = jdbcTemplate.queryForObject(
                "SELECT message FROM test_connection LIMIT 1",
                String.class
        );

        return "Database connected! Message: " + message;
    }
}