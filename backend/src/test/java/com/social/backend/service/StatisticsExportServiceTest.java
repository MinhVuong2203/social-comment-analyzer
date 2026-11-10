package com.social.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.social.backend.entity.Comment;
import com.social.backend.entity.Post;
import com.social.backend.entity.Prediction;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PredictionRepository;
import com.social.backend.service.StatisticsExportService.Format;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - StatisticsExportService (Xuất báo cáo Thống kê)")
class StatisticsExportServiceTest {

    private static final List<Comment> COMMENTS = List.of(
            Comment.builder().threadsCommentId("c1").username("an").text("Xin chào \"bạn\", dòng 1\ndòng 2")
                    .threadsTimestamp("2026-01-01T00:00:00+0000").build(),
            Comment.builder().threadsCommentId("c2").username("@evil").text("=HYPERLINK(\"http://x\")").build(),
            Comment.builder().threadsCommentId("c3").username("binh").text("  +1 chưa phân tích").build()
    );

    private static final List<Prediction> PREDICTIONS = List.of(
            Prediction.builder().threadsCommentId("c1").toxicityLabel("NON-TOXIC").toxicityConfidence(0.9)
                    .hateSpeechLabel("CLEAN").hateSpeechConfidence(0.8)
                    .sentimentLabel("POSITIVE").sentimentConfidence(0.7).build(),
            Prediction.builder().threadsCommentId("c2").toxicityLabel("TOXIC").toxicityConfidence(0.6)
                    .hateSpeechLabel("HATE").hateSpeechConfidence(0.5)
                    .sentimentLabel("NEGATIVE").sentimentConfidence(0.4).build()
    );

    private static final List<StatisticsExportService.ExportRow> ROWS =
            StatisticsExportService.toRows(COMMENTS, PREDICTIONS);

    @Mock
    private StatisticsService statisticsService;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PredictionRepository predictionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private StatisticsExportService exportService;

    @BeforeEach
    void setUp() {
        exportService = new StatisticsExportService(
                statisticsService, commentRepository, predictionRepository, objectMapper);
    }

    @Test
    @DisplayName("ST-EX-001: CSV có BOM UTF-8, escape dấu ngoặc kép và giữ xuống dòng trong ô")
    void shouldWriteCsvWithBomAndEscaping() {
        byte[] bytes = StatisticsExportService.toCsv(ROWS);

        assertEquals((byte) 0xEF, bytes[0]);
        assertEquals((byte) 0xBB, bytes[1]);
        assertEquals((byte) 0xBF, bytes[2]);
        String csv = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(csv.contains("comment_id,username,text,timestamp,toxicity_label"));
        assertTrue(csv.contains("\"Xin chào \"\"bạn\"\", dòng 1\ndòng 2\""));
        assertTrue(csv.contains(",0.9,"));
    }

    @Test
    @DisplayName("ST-EX-002: CSV vô hiệu hóa nội dung bắt đầu bằng ký tự công thức")
    void shouldNeutralizeFormulasInCsv() {
        String csv = new String(StatisticsExportService.toCsv(ROWS), StandardCharsets.UTF_8);

        assertTrue(csv.contains("\"'=HYPERLINK(\"\"http://x\"\")\""));
        assertTrue(csv.contains("\"'@evil\""));
        assertTrue(csv.contains("\"'  +1 chưa phân tích\""));
        assertFalse(csv.contains("\"=HYPERLINK"));
    }

    @Test
    @DisplayName("ST-EX-003: Reply chưa phân tích vẫn được xuất, các cột nhãn để trống")
    void shouldExportUnanalyzedRepliesWithBlankLabels() {
        String csv = new String(StatisticsExportService.toCsv(ROWS), StandardCharsets.UTF_8);

        // Sau cột text còn cột thời gian và 6 cột nhãn, độ tin cậy, đều trống với c3
        assertTrue(csv.contains("chưa phân tích\",,,,,,,\r\n"));
    }

    @Test
    @DisplayName("ST-EX-004: XLSX lưu nội dung giống công thức dưới dạng chữ, độ tin cậy dạng số")
    void shouldWriteXlsxCellsWithCorrectTypes() throws IOException {
        try (Workbook workbook = WorkbookFactory.create(
                new ByteArrayInputStream(StatisticsExportService.toXlsx(ROWS)))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertEquals(3, sheet.getLastRowNum());
            assertEquals("comment_id", sheet.getRow(0).getCell(0).getStringCellValue());

            Row analyzed = sheet.getRow(2);
            assertEquals(CellType.STRING, analyzed.getCell(2).getCellType());
            assertEquals("=HYPERLINK(\"http://x\")", analyzed.getCell(2).getStringCellValue());
            assertEquals(CellType.NUMERIC, analyzed.getCell(5).getCellType());
            assertEquals(0.6, analyzed.getCell(5).getNumericCellValue());

            assertNull(sheet.getRow(3).getCell(4));
        }
    }

    @Test
    @DisplayName("ST-EX-005: XLSX cắt nội dung vượt giới hạn 32767 ký tự của một ô thay vì báo lỗi")
    void shouldTruncateOversizedXlsxCell() throws IOException {
        List<StatisticsExportService.ExportRow> rows = StatisticsExportService.toRows(
                List.of(Comment.builder().threadsCommentId("c1").text("a".repeat(40000)).build()), List.of());

        try (Workbook workbook = WorkbookFactory.create(
                new ByteArrayInputStream(StatisticsExportService.toXlsx(rows)))) {
            assertEquals(32767, workbook.getSheetAt(0).getRow(1).getCell(2).getStringCellValue().length());
        }
    }

    @Test
    @DisplayName("ST-EX-006: Xuất JSON gồm postId, tổng số và danh sách bình luận kèm nhãn")
    void shouldExportJsonWithComments() throws IOException {
        when(commentRepository.findByThreadsPostIdOrderByCreatedAtDesc("p1")).thenReturn(COMMENTS);
        when(predictionRepository.findByThreadsPostId("p1")).thenReturn(PREDICTIONS);
        when(statisticsService.requireOwnedPost("p1", "u1")).thenReturn(Post.builder().threadsPostId("p1").build());

        JsonNode json = objectMapper.readTree(exportService.export("p1", "u1", Format.JSON));

        assertEquals("p1", json.get("postId").asText());
        assertEquals(3, json.get("total").asInt());
        assertEquals("c1", json.get("comments").get(0).get("commentId").asText());
        assertEquals("NON-TOXIC", json.get("comments").get(0).get("toxicityLabel").asText());
        assertTrue(json.get("comments").get(2).get("toxicityLabel").isNull());
    }

    @Test
    @DisplayName("ST-EX-007: Không đọc dữ liệu khi bài không thuộc người dùng")
    void shouldNotReadDataForForeignPost() {
        when(statisticsService.requireOwnedPost("p1", "stranger"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        assertThrows(ResponseStatusException.class, () -> exportService.export("p1", "stranger", Format.CSV));

        verifyNoInteractions(commentRepository, predictionRepository);
    }

    @Test
    @DisplayName("ST-EX-008: Chỉ chấp nhận csv, json, xlsx và không phân biệt hoa thường")
    void shouldParseSupportedFormatsOnly() {
        assertEquals(Format.XLSX, Format.parse("XLSX"));
        assertEquals(Format.CSV, Format.parse("csv"));
        assertEquals(Format.JSON, Format.parse("Json"));
        assertThrows(ResponseStatusException.class, () -> Format.parse("pdf"));
        assertThrows(ResponseStatusException.class, () -> Format.parse(null));
    }
}
