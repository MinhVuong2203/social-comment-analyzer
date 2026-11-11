package com.social.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.entity.Comment;
import com.social.backend.entity.Prediction;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PredictionRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Xuất báo cáo của một bài viết: mỗi bình luận một dòng, kèm nhãn và độ tin cậy nếu đã phân tích. */
@Service
public class StatisticsExportService {

    public enum Format {
        CSV("csv", "text/csv;charset=UTF-8"),
        JSON("json", MediaType.APPLICATION_JSON_VALUE),
        XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        private final String extension;
        private final String contentType;

        Format(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }

        public static Format parse(String value) {
            return Arrays.stream(values())
                    .filter(f -> f.extension.equals(value == null ? "" : value.toLowerCase(Locale.ROOT)))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Định dạng không hỗ trợ. Chọn csv, json hoặc xlsx"));
        }

        public String extension() {
            return extension;
        }

        public String contentType() {
            return contentType;
        }
    }

    /** Giới hạn số ký tự của một ô trong Excel; vượt quá thì POI báo lỗi. */
    private static final int XLSX_MAX_CELL_LENGTH = 32767;

    private static final List<String> HEADERS = List.of(
            "comment_id", "username", "text", "timestamp",
            "toxicity_label", "toxicity_confidence",
            "hate_speech_label", "hate_speech_confidence",
            "sentiment_label", "sentiment_confidence"
    );

    record ExportRow(
            String commentId,
            String username,
            String text,
            String timestamp,
            String toxicityLabel,
            Double toxicityConfidence,
            String hateSpeechLabel,
            Double hateSpeechConfidence,
            String sentimentLabel,
            Double sentimentConfidence
    ) {
        List<Object> cells() {
            return Arrays.asList(
                    commentId, username, text, timestamp,
                    toxicityLabel, toxicityConfidence,
                    hateSpeechLabel, hateSpeechConfidence,
                    sentimentLabel, sentimentConfidence
            );
        }
    }

    private final StatisticsService statisticsService;
    private final CommentRepository commentRepository;
    private final PredictionRepository predictionRepository;
    private final ObjectMapper objectMapper;

    public StatisticsExportService(
            StatisticsService statisticsService,
            CommentRepository commentRepository,
            PredictionRepository predictionRepository,
            ObjectMapper objectMapper
    ) {
        this.statisticsService = statisticsService;
        this.commentRepository = commentRepository;
        this.predictionRepository = predictionRepository;
        this.objectMapper = objectMapper;
    }

    public byte[] export(String postId, String threadsUserId, Format format) {
        statisticsService.requireOwnedPost(postId, threadsUserId);
        List<ExportRow> rows = toRows(
                commentRepository.findByThreadsPostIdOrderByCreatedAtDesc(postId),
                predictionRepository.findByThreadsPostId(postId)
        );
        return switch (format) {
            case CSV -> toCsv(rows);
            case JSON -> toJson(postId, rows);
            case XLSX -> toXlsx(rows);
        };
    }

    static List<ExportRow> toRows(List<Comment> comments, List<Prediction> predictions) {
        Map<String, Prediction> predictionByComment = new HashMap<>();
        for (Prediction p : predictions) {
            predictionByComment.put(p.getThreadsCommentId(), p);
        }

        List<ExportRow> rows = new ArrayList<>(comments.size());
        for (Comment c : comments) {
            Prediction p = predictionByComment.get(c.getThreadsCommentId());
            rows.add(new ExportRow(
                    c.getThreadsCommentId(),
                    c.getUsername(),
                    c.getText(),
                    c.getThreadsTimestamp(),
                    p == null ? null : p.getToxicityLabel(),
                    p == null ? null : p.getToxicityConfidence(),
                    p == null ? null : p.getHateSpeechLabel(),
                    p == null ? null : p.getHateSpeechConfidence(),
                    p == null ? null : p.getSentimentLabel(),
                    p == null ? null : p.getSentimentConfidence()
            ));
        }
        return rows;
    }

    /** Có BOM UTF-8 để Excel hiển thị đúng tiếng Việt khi mở trực tiếp. */
    static byte[] toCsv(List<ExportRow> rows) {
        StringBuilder csv = new StringBuilder("﻿");
        csv.append(String.join(",", HEADERS)).append("\r\n");
        for (ExportRow row : rows) {
            csv.append(row.cells().stream().map(StatisticsExportService::csvCell).collect(Collectors.joining(",")))
                    .append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String csvCell(Object value) {
        if (value == null) return "";
        if (value instanceof Number) return value.toString();
        return "\"" + neutralizeFormula(value.toString()).replace("\"", "\"\"") + "\"";
    }

    /** Bình luận là nội dung do người ngoài viết, nên không để Excel chạy nó như công thức. */
    private static String neutralizeFormula(String value) {
        String trimmed = value.stripLeading();
        if (!trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0
                || !value.isEmpty() && "\t\r".indexOf(value.charAt(0)) >= 0) {
            return "'" + value;
        }
        return value;
    }

    private byte[] toJson(String postId, List<ExportRow> rows) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(
                    Map.of("postId", postId, "total", rows.size(), "comments", rows));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file JSON", e);
        }
    }

    static byte[] toXlsx(List<ExportRow> rows) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Comments");
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.size(); i++) {
                header.createCell(i).setCellValue(HEADERS.get(i));
            }
            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                List<Object> cells = rows.get(r).cells();
                for (int i = 0; i < cells.size(); i++) {
                    writeCell(row, i, cells.get(i));
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file XLSX", e);
        }
    }

    private static void writeCell(Row row, int index, Object value) {
        if (value == null) return;
        Cell cell = row.createCell(index);
        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
            return;
        }
        // setCellValue(String) luôn tạo ô chữ, Excel không chạy nội dung này như công thức
        String text = value.toString();
        cell.setCellValue(text.length() > XLSX_MAX_CELL_LENGTH ? text.substring(0, XLSX_MAX_CELL_LENGTH) : text);
    }
}
