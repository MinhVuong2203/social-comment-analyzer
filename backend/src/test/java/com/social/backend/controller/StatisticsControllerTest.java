package com.social.backend.controller;

import com.social.backend.dto.StatisticsResponse;
import com.social.backend.dto.StatisticsResponse.Keyword;
import com.social.backend.dto.StatisticsResponse.LabelCount;
import com.social.backend.dto.StatisticsResponse.Status;
import com.social.backend.dto.StatisticsResponse.Trend;
import com.social.backend.dto.StatisticsResponse.TrendPoint;
import com.social.backend.service.StatisticsExportService;
import com.social.backend.service.StatisticsExportService.Format;
import com.social.backend.service.StatisticsService;
import com.social.backend.service.UserLimitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - StatisticsController (API trang Thống kê)")
class StatisticsControllerTest {

    private static final String STATS_URL = "/api/statistics/posts/{postId}";
    private static final String EXPORT_URL = STATS_URL + "/export";
    private static final byte[] FILE = "noi-dung".getBytes(StandardCharsets.UTF_8);

    private MockMvc mockMvc;

    @Mock
    private StatisticsService statisticsService;

    @Mock
    private StatisticsExportService statisticsExportService;

    @Mock
    private UserLimitService userLimitService;

    @InjectMocks
    private StatisticsController statisticsController;

    private MockHttpSession userSession;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(statisticsController).build();
        userSession = new MockHttpSession();
        userSession.setAttribute("threads_user_id", "u1");
        userSession.setAttribute("threads_access_token", "token");
        lenient().when(userLimitService.canExport(any())).thenReturn(true);
    }

    private static StatisticsResponse sampleResponse(boolean repliesSynced) {
        return new StatisticsResponse(
                "p1", Status.FINALIZED, repliesSynced, 4, 4, 100.0, 1,
                new LabelCount(1, 25.0),
                new LabelCount(1, 25.0),
                new LabelCount(2, 50.0),
                new LabelCount(1, 25.0),
                new LabelCount(1, 25.0),
                new Trend(true, 0, List.of(new TrendPoint(0, 1, 0))),
                List.of(new Keyword("công nghệ", 2, "POSITIVE"))
        );
    }

    @Test
    @DisplayName("ST-API-001: Lấy thống kê khi chưa đăng nhập trả 401")
    void shouldRejectStatisticsWithoutLogin() throws Exception {
        mockMvc.perform(get(STATS_URL, "p1"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(statisticsService);
    }

    @Test
    @DisplayName("ST-API-002: Lấy thống kê thành công, truyền đúng user và token xuống service")
    void shouldReturnStatisticsForLoggedInUser() throws Exception {
        when(statisticsService.getStatistics("p1", "u1", "token")).thenReturn(sampleResponse(true));

        mockMvc.perform(get(STATS_URL, "p1").session(userSession))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.postId").value("p1"))
                .andExpect(jsonPath("$.status").value("FINALIZED"))
                .andExpect(jsonPath("$.repliesSynced").value(true))
                .andExpect(jsonPath("$.totalReplies").value(4))
                .andExpect(jsonPath("$.analyzedPercent").value(100.0))
                .andExpect(jsonPath("$.toxic.count").value(1))
                .andExpect(jsonPath("$.hate.percent").value(25.0))
                .andExpect(jsonPath("$.positive.count").value(2))
                .andExpect(jsonPath("$.trend.startsAtPost").value(true))
                .andExpect(jsonPath("$.trend.points[0].toxic").value(1))
                .andExpect(jsonPath("$.keywords[0].term").value("công nghệ"))
                .andExpect(jsonPath("$.keywords[0].sentiment").value("POSITIVE"));
    }

    @Test
    @DisplayName("ST-API-003: Session không có access token vẫn trả dữ liệu đã lưu, repliesSynced=false")
    void shouldReturnStoredStatisticsWhenSessionHasNoToken() throws Exception {
        MockHttpSession noToken = new MockHttpSession();
        noToken.setAttribute("threads_user_id", "u1");
        when(statisticsService.getStatistics(eq("p1"), eq("u1"), isNull())).thenReturn(sampleResponse(false));

        mockMvc.perform(get(STATS_URL, "p1").session(noToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repliesSynced").value(false));
    }

    @Test
    @DisplayName("ST-API-004: Bài viết không tồn tại hoặc của người khác trả 404")
    void shouldReturnNotFoundForMissingOrForeignPost() throws Exception {
        when(statisticsService.getStatistics("p2", "u1", "token"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết: p2"));

        mockMvc.perform(get(STATS_URL, "p2").session(userSession))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("ST-API-005: Gọi API thống kê bằng POST trả 405")
    void shouldRejectPostMethodOnStatistics() throws Exception {
        mockMvc.perform(post(STATS_URL, "p1").session(userSession))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("ST-API-006: Xuất CSV trả file đính kèm đúng định dạng")
    void shouldExportCsvAsAttachment() throws Exception {
        when(statisticsExportService.export("p1", "u1", Format.CSV)).thenReturn(FILE);

        mockMvc.perform(get(EXPORT_URL, "p1").param("format", "csv").session(userSession))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        containsString("attachment; filename=\"thong-ke-p1.csv\"")))
                .andExpect(content().bytes(FILE));
    }

    @Test
    @DisplayName("ST-API-007: Xuất JSON trả Content-Type application/json")
    void shouldExportJson() throws Exception {
        when(statisticsExportService.export("p1", "u1", Format.JSON)).thenReturn(FILE);

        mockMvc.perform(get(EXPORT_URL, "p1").param("format", "json").session(userSession))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("thong-ke-p1.json")));
    }

    @Test
    @DisplayName("ST-API-008: Xuất XLSX, tham số format không phân biệt hoa thường")
    void shouldExportXlsxWithUppercaseFormat() throws Exception {
        when(statisticsExportService.export("p1", "u1", Format.XLSX)).thenReturn(FILE);

        mockMvc.perform(get(EXPORT_URL, "p1").param("format", "XLSX").session(userSession))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("thong-ke-p1.xlsx")));
    }

    @Test
    @DisplayName("ST-API-009: Xuất báo cáo khi chưa đăng nhập trả 401")
    void shouldRejectExportWithoutLogin() throws Exception {
        mockMvc.perform(get(EXPORT_URL, "p1").param("format", "csv"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(statisticsExportService);
    }

    @Test
    @DisplayName("ST-API-010: Định dạng không hỗ trợ trả 400 và không tạo file")
    void shouldRejectUnsupportedExportFormat() throws Exception {
        mockMvc.perform(get(EXPORT_URL, "p1").param("format", "pdf").session(userSession))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(statisticsExportService);
    }

    @Test
    @DisplayName("ST-API-011: Thiếu tham số format trả 400")
    void shouldRejectExportWithoutFormat() throws Exception {
        mockMvc.perform(get(EXPORT_URL, "p1").session(userSession))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(statisticsExportService);
    }

    @Test
    @DisplayName("ST-API-012: Xuất báo cáo của bài không thuộc người dùng trả 404")
    void shouldReturnNotFoundWhenExportingForeignPost() throws Exception {
        when(statisticsExportService.export(any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));

        mockMvc.perform(get(EXPORT_URL, "p2").param("format", "csv").session(userSession))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("ST-API-013: Tên file loại bỏ ký tự đặc biệt của postId, chống chèn header")
    void shouldSanitizeFilename() throws Exception {
        String postId = "p-1_x.\"y";
        when(statisticsExportService.export(postId, "u1", Format.CSV)).thenReturn(FILE);

        mockMvc.perform(get(EXPORT_URL, postId).param("format", "csv").session(userSession))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        containsString("filename=\"thong-ke-p-1_xy.csv\"")));

        verify(statisticsExportService).export(postId, "u1", Format.CSV);
    }
}
