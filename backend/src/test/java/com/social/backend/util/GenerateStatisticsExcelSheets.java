package com.social.backend.util;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Thêm các sheet Statistics_* vào 3 file Excel trong thư mục testing, không đụng tới sheet khác.
 * Cột Result của sheet API lấy từ báo cáo Surefire, nên phải chạy test thống kê trước:
 *
 * mvnw test -Dtest="Statistics*Test,ThreadsPostServiceSyncRepliesTest"
 * mvnw test -Dtest=GenerateStatisticsExcelSheets
 */
public class GenerateStatisticsExcelSheets {

    private static final String FEATURE = "Trang Thống kê (StatisticsPage)";
    private static final String URL = "http://localhost:5173/#/statistics";
    private static final Pattern TEST_CASE = Pattern.compile(
            "<testcase\\s+name=\"([^\"]+)\"(.*?)(?=<testcase\\s|</testsuite>)", Pattern.DOTALL);

    @Test
    public void generateStatisticsSheets() throws Exception {
        Path testingDir = Stream.of("../testing", "testing").map(Paths::get).filter(Files::exists).findFirst()
                .orElseThrow(() -> new FileNotFoundException("Không tìm thấy thư mục testing"));

        Map<String, String> results = readSurefireResults(Paths.get("target/surefire-reports"));
        writeViewpointSheet(testingDir.resolve("Test_viewpoint.xlsx").toFile());
        writeApiSheet(testingDir.resolve("Testcase_API.xlsx").toFile(), results);
        writeScreenSheet(testingDir.resolve("Testcase_Screen.xlsx").toFile());
    }

    private static Map<String, String> readSurefireResults(Path reportDir) throws IOException {
        Map<String, String> results = new HashMap<>();
        List<Path> reports;
        try (Stream<Path> files = Files.list(reportDir)) {
            reports = files.filter(p -> p.getFileName().toString().matches(
                    "TEST-.*(Statistics(Controller|Service|ExportService)Test|ThreadsPostServiceSyncRepliesTest)\\.xml")).toList();
        }
        for (Path report : reports) {
            Matcher m = TEST_CASE.matcher(Files.readString(report, StandardCharsets.UTF_8));
            while (m.find()) {
                String body = m.group(2);
                results.put(m.group(1), body.contains("<failure") || body.contains("<error") ? "Failed" : "Passed");
            }
        }
        return results;
    }

    /* ── Viewpoint ── */

    private void writeViewpointSheet(File file) throws IOException {
        try (XSSFWorkbook wb = open(file)) {
            XSSFSheet sheet = recreateSheet(wb, "Statistics_Viewpoint");
            XSSFCellStyle header = headerStyle(wb, 217, 225, 242);
            XSSFCellStyle data = dataStyle(wb);
            XSSFCellStyle center = centerStyle(wb, data);

            fillHeader(sheet, header, 0, 1, 7);
            sheet.getRow(0).getCell(0).setCellValue("No.");
            sheet.getRow(0).getCell(1).setCellValue("Tên bộ phận/ Tên hệ thống chức năng");
            sheet.getRow(0).getCell(2).setCellValue("Đối tượng test");
            sheet.getRow(1).getCell(2).setCellValue("Mục lớn");
            sheet.getRow(1).getCell(3).setCellValue("Mục trung");
            sheet.getRow(1).getCell(4).setCellValue("Mục nhỏ");
            sheet.getRow(0).getCell(5).setCellValue("Mục xác nhận");
            sheet.getRow(0).getCell(6).setCellValue("Ghi chú");
            merge(sheet, "0:1:0:0", "0:1:1:1", "0:0:2:4", "0:1:5:5", "0:1:6:6");

            String[][] viewpoints = {
                    {"Hiển thị", "Tiêu đề & huy hiệu", "Trạng thái dữ liệu", "Xác nhận huy hiệu đúng theo trạng thái: Đã chốt số, Có reply mới, Chưa phân tích, Chưa có reply", "UI"},
                    {"Hiển thị", "Chọn bài viết", "Dropdown", "Xác nhận liệt kê bài viết của tài khoản, mặc định bài đầu tiên và tải lại số liệu khi đổi bài", "Function"},
                    {"Số liệu", "Thẻ tổng quan", "Replies / Toxic / Hate", "Xác nhận số lượng và % đúng; % toxic, hate tính trên số reply đã phân tích; OFFENSIVE không tính là hate", "Business"},
                    {"Số liệu", "Thẻ tổng quan", "Reply trong 1 giờ", "Xác nhận chỉ đếm reply trong 60 phút gần nhất", "Business"},
                    {"Số liệu", "Phân bố cảm xúc", "Biểu đồ tròn", "Xác nhận 3 sắc thái đúng số lượng, tâm biểu đồ hiện sắc thái chiếm ưu thế", "UI / Business"},
                    {"Số liệu", "Xu hướng độc hại", "Biểu đồ đường", "Xác nhận 12 mốc cộng dồn, trục thời gian co giãn theo dữ liệu, reply thiếu thời gian được báo riêng", "UI / Business"},
                    {"Số liệu", "Từ khóa nổi bật", "Top 8", "Xác nhận ưu tiên cụm từ, loại stopword, URL, mention; cần ít nhất 2 bình luận; màu theo cảm xúc", "Business"},
                    {"Đồng bộ", "Lấy reply từ Threads", "Mở trang", "Xác nhận reply được đồng bộ trước khi tính, lấy cả /conversation và fallback /replies", "Integration"},
                    {"Đồng bộ", "Lấy reply từ Threads", "Threads lỗi", "Xác nhận hiện cảnh báo và vẫn hiển thị dữ liệu đã lưu thay vì lặng lẽ ra 0", "Error handling"},
                    {"Phân tích", "Nút Phân tích ngay", "Reply chưa phân tích", "Xác nhận nút chỉ hiện khi còn reply chưa phân tích, số liệu cập nhật sau khi phân tích, báo lỗi khi AI Service tắt", "Function"},
                    {"Xuất báo cáo", "CSV / JSON / XLSX", "Nội dung file", "Xác nhận mỗi bình luận một dòng, reply chưa phân tích để trống cột nhãn, tiếng Việt hiển thị đúng trong Excel", "Function"},
                    {"Xuất báo cáo", "Tham số format", "Validation", "Xác nhận định dạng lạ hoặc thiếu trả 400", "Validation"},
                    {"Bảo mật", "Phiên đăng nhập", "Chưa đăng nhập", "Xác nhận cả 2 API trả 401 khi không có session", "Security"},
                    {"Bảo mật", "Quyền sở hữu bài viết", "Bài của người khác", "Xác nhận trả 404, không gọi Threads và không đọc dữ liệu", "Security"},
                    {"Bảo mật", "Chèn công thức / header", "Nội dung từ người ngoài", "Xác nhận CSV vô hiệu hóa ký tự công thức, tên file loại ký tự đặc biệt", "Security"},
            };
            for (int i = 0; i < viewpoints.length; i++) {
                XSSFRow row = sheet.createRow(2 + i);
                row.setHeightInPoints(30);
                row.createCell(0).setCellValue(i + 1);
                row.getCell(0).setCellStyle(center);
                write(row, 1, FEATURE, data);
                for (int j = 0; j < viewpoints[i].length; j++) {
                    write(row, 2 + j, viewpoints[i][j], data);
                }
            }
            widths(sheet, 1800, 7500, 5000, 6000, 5000, 18000, 4000);
            save(wb, file);
        }
    }

    /* ── API ── */

    private static String[] api(String id, String item, String name, String pre, String data, String params,
                                String status, String body, String method) {
        return new String[]{id, item, name, pre, data, params, "None", status, body, "Không thay đổi", method};
    }

    private static String[] unit(String id, String item, String name, String pre, String expected, String db, String method) {
        return new String[]{id, item, name, pre, "Dữ liệu mock", "None", "None", "N/A (Unit)", expected, db, method};
    }

    private static final String LOGGED_IN = "Đã đăng nhập, session có threads_user_id và threads_access_token";
    private static final String STATS = "GET /api/statistics/posts/{postId}";
    private static final String EXPORT = "GET /api/statistics/posts/{postId}/export";

    private static final String[][] API_CASES = {
            api("ST-API-001", "Statistics", STATS + " khi chưa đăng nhập", "Session rỗng", "postId=p1", "path: postId=p1", "401 Unauthorized", "Lỗi Vui lòng đăng nhập", "shouldRejectStatisticsWithoutLogin"),
            api("ST-API-002", "Statistics", "Lấy thống kê thành công", LOGGED_IN, "postId=p1", "path: postId=p1", "200 OK", "postId, status, repliesSynced, totalReplies, toxic, hate, positive, trend, keywords", "shouldReturnStatisticsForLoggedInUser"),
            api("ST-API-003", "Statistics", "Session không có access token", "Có threads_user_id, không có token", "postId=p1", "path: postId=p1", "200 OK", "Dữ liệu đã lưu, repliesSynced=false", "shouldReturnStoredStatisticsWhenSessionHasNoToken"),
            api("ST-API-004", "Statistics", "Bài không tồn tại hoặc của người khác", LOGGED_IN, "postId=p2", "path: postId=p2", "404 Not Found", "Không tìm thấy bài viết: p2", "shouldReturnNotFoundForMissingOrForeignPost"),
            api("ST-API-005", "Statistics", "Gọi API thống kê bằng POST", LOGGED_IN, "postId=p1", "path: postId=p1", "405 Method Not Allowed", "Trống", "shouldRejectPostMethodOnStatistics"),
            api("ST-API-006", "Export", "Xuất CSV", LOGGED_IN, "format=csv", "format=csv", "200 OK", "text/csv, attachment; filename=thong-ke-p1.csv", "shouldExportCsvAsAttachment"),
            api("ST-API-007", "Export", "Xuất JSON", LOGGED_IN, "format=json", "format=json", "200 OK", "application/json, thong-ke-p1.json", "shouldExportJson"),
            api("ST-API-008", "Export", "Xuất XLSX, format viết hoa", LOGGED_IN, "format=XLSX", "format=XLSX", "200 OK", "Content-Type spreadsheetml, thong-ke-p1.xlsx", "shouldExportXlsxWithUppercaseFormat"),
            api("ST-API-009", "Export", EXPORT + " khi chưa đăng nhập", "Session rỗng", "format=csv", "format=csv", "401 Unauthorized", "Lỗi Vui lòng đăng nhập", "shouldRejectExportWithoutLogin"),
            api("ST-API-010", "Export", "Định dạng không hỗ trợ", LOGGED_IN, "format=pdf", "format=pdf", "400 Bad Request", "Định dạng không hỗ trợ", "shouldRejectUnsupportedExportFormat"),
            api("ST-API-011", "Export", "Thiếu tham số format", LOGGED_IN, "Không có format", "None", "400 Bad Request", "Trống", "shouldRejectExportWithoutFormat"),
            api("ST-API-012", "Export", "Xuất báo cáo bài của người khác", LOGGED_IN, "postId=p2", "format=csv", "404 Not Found", "Không tìm thấy bài viết", "shouldReturnNotFoundWhenExportingForeignPost"),
            api("ST-API-013", "Export", "Tên file loại ký tự đặc biệt của postId", LOGGED_IN, "postId=p-1_x.\"y", "format=csv", "200 OK", "filename=thong-ke-p-1_xy.csv", "shouldSanitizeFilename"),
    };

    private static final String[][] LOGIC_CASES = {
            unit("ST-SV-001", "Statistics Logic", "Đồng bộ reply trước khi đọc DB", "Bài thuộc người dùng", "totalReplies=1, status=NOT_ANALYZED", "Comment mới được lưu qua bước đồng bộ", "shouldSyncRepliesBeforeReading"),
            unit("ST-SV-002", "Statistics Logic", "Báo đồng bộ thất bại", "Threads lỗi", "repliesSynced=false", "Không thay đổi", "shouldReportFailedSync"),
            unit("ST-SV-003", "Statistics Logic", "Bài của người khác không gọi Threads", "Khác threads_user_id", "404, không gọi syncPostReplies", "Không thay đổi", "shouldNotSyncPostOfAnotherUser"),
            unit("ST-SV-004", "Statistics Logic", "Bài không tồn tại", "Không có trong DB", "404", "Không thay đổi", "shouldReturnNotFoundForMissingPost"),
            unit("ST-SV-005", "Statistics Logic", "Phân tích định dạng thời gian Threads", "+0000, +07:00, Z", "Cùng một Instant", "Không thay đổi", "shouldParseThreadsTimestampFormats"),
            unit("ST-SV-006", "Statistics Logic", "Thời gian không hợp lệ", "Rỗng, null, thiếu múi giờ", "Optional.empty", "Không thay đổi", "shouldIgnoreInvalidTimestamps"),
            unit("ST-SV-007", "Statistics Logic", "Bài chưa có reply", "0 comment", "NO_REPLIES, % = 0, không chia cho 0", "Không thay đổi", "shouldHandleEmptyPost"),
            unit("ST-SV-008", "Statistics Logic", "Đếm nhãn và %", "4 comment, 3 đã phân tích", "HAS_NEW_REPLIES, toxic 2 (66.7%), hate 1 (33.3%)", "Không thay đổi", "shouldCountLabelsOverAnalyzedReplies"),
            unit("ST-SV-009", "Statistics Logic", "Nhãn cảm xúc lạ hoặc rỗng", "MIXED, null", "Tính là trung tính", "Không thay đổi", "shouldCountUnknownSentimentAsNeutral"),
            unit("ST-SV-010", "Statistics Logic", "Trần % đã phân tích", "Số prediction nhiều hơn comment", "FINALIZED, 100%", "Không thay đổi", "shouldFinalizeAndCapAnalyzedPercent"),
            unit("ST-SV-011", "Statistics Logic", "Reply trong 60 phút", "Biên, cũ, tương lai, sai định dạng", "Chỉ đếm 2 reply hợp lệ", "Không thay đổi", "shouldCountRepliesInLastHour"),
            unit("ST-SV-012", "Statistics Logic", "Xu hướng cộng dồn", "Có reply thiếu thời gian và chưa phân tích", "12 mốc, kết thúc +110 phút, skippedReplies=1", "Không thay đổi", "shouldBuildCumulativeTrend"),
            unit("ST-SV-013", "Statistics Logic", "Thiếu thời gian đăng bài", "threadsTimestamp null", "startsAtPost=false, mốc đầu là reply đầu tiên", "Không thay đổi", "shouldStartTrendAtFirstReplyWhenPostTimeMissing"),
            unit("ST-SV-014", "Statistics Logic", "Reply sớm hơn lúc đăng", "Lệch đồng hồ", "Vẫn được tính, không âm", "Không thay đổi", "shouldKeepRepliesEarlierThanPost"),
            unit("ST-SV-015", "Statistics Logic", "Trích xuất từ khóa", "Có lặp từ, NFD, URL, mention", "công nghệ = 3, giá cả = 2", "Không thay đổi", "shouldExtractKeywords"),
            unit("ST-SV-016", "Statistics Logic", "Không ghép cụm qua dấu câu", "2 câu trong 1 bình luận", "Không có cụm thoại pin", "Không thay đổi", "shouldNotBuildPhrasesAcrossPunctuation"),
            unit("ST-SV-017", "Statistics Logic", "Giới hạn top 8", "10 từ, có bình luận chưa phân tích", "8 từ khóa, bỏ bình luận chưa phân tích", "Không thay đổi", "shouldCapKeywordsAndIgnoreUnanalyzed"),
            unit("ST-SV-018", "Statistics Logic", "Ngưỡng tối thiểu từ khóa", "Từ chỉ ở 1 bình luận, text null", "Danh sách rỗng, không lỗi", "Không thay đổi", "shouldRequireTwoCommentsForKeyword"),
            unit("ST-EX-001", "Export Logic", "CSV có BOM và escape", "Có dấu ngoặc kép, xuống dòng", "BOM UTF-8, ô được escape đúng", "Không thay đổi", "shouldWriteCsvWithBomAndEscaping"),
            unit("ST-EX-002", "Export Logic", "CSV vô hiệu hóa công thức", "Ô bắt đầu bằng =, @, +", "Thêm dấu ' ở đầu ô", "Không thay đổi", "shouldNeutralizeFormulasInCsv"),
            unit("ST-EX-003", "Export Logic", "Reply chưa phân tích", "Không có prediction", "Vẫn xuất, cột nhãn trống", "Không thay đổi", "shouldExportUnanalyzedRepliesWithBlankLabels"),
            unit("ST-EX-004", "Export Logic", "Kiểu ô XLSX", "Nội dung giống công thức", "Ô chữ, độ tin cậy là số", "Không thay đổi", "shouldWriteXlsxCellsWithCorrectTypes"),
            unit("ST-EX-005", "Export Logic", "Giới hạn ô XLSX", "Nội dung 40000 ký tự", "Cắt còn 32767 ký tự", "Không thay đổi", "shouldTruncateOversizedXlsxCell"),
            unit("ST-EX-006", "Export Logic", "Cấu trúc file JSON", "3 comment, 2 prediction", "postId, total=3, comments kèm nhãn", "Không thay đổi", "shouldExportJsonWithComments"),
            unit("ST-EX-007", "Export Logic", "Xuất bài của người khác", "Không phải chủ bài", "404, không đọc dữ liệu", "Không thay đổi", "shouldNotReadDataForForeignPost"),
            unit("ST-EX-008", "Export Logic", "Danh sách định dạng", "csv, json, xlsx, pdf, null", "Chỉ nhận 3 định dạng", "Không thay đổi", "shouldParseSupportedFormatsOnly"),
            unit("ST-SY-001", "Sync Logic", "Không có token", "Token null hoặc rỗng", "false, không gọi Threads", "Không thay đổi", "shouldNotCallThreadsWithoutToken"),
            unit("ST-SY-002", "Sync Logic", "Lưu reply mới từ /conversation", "Comment chưa có trong DB", "true", "Insert 1 Comment", "shouldSaveNewReplyFromConversation"),
            unit("ST-SY-003", "Sync Logic", "Reply lồng nhau", "replied_to là bình luận khác", "parentId=c1, isReply=true", "Insert 1 Comment", "shouldLinkNestedReplyToParent"),
            unit("ST-SY-004", "Sync Logic", "Fallback /replies", "/conversation không có dữ liệu", "true", "Insert 1 Comment", "shouldFallBackToRepliesEndpoint"),
            unit("ST-SY-005", "Sync Logic", "Reply đã tồn tại", "Comment đã có trong DB", "true", "Update, không tạo trùng", "shouldUpdateExistingReply"),
            unit("ST-SY-006", "Sync Logic", "Threads từ chối", "HTTP 403", "false, không ném lỗi", "Không thay đổi", "shouldReturnFalseWhenThreadsRejects"),
            unit("ST-SY-007", "Sync Logic", "Mất kết nối Threads", "Timeout", "false, không ném lỗi", "Không thay đổi", "shouldReturnFalseWhenThreadsUnreachable"),
            unit("ST-SY-008", "Sync Logic", "Dữ liệu không hợp lệ", "Cả 2 endpoint không có data", "false", "Không thay đổi", "shouldReturnFalseForInvalidResponse"),
            unit("ST-SY-009", "Sync Logic", "Danh sách rỗng", "data = []", "true", "Không thay đổi", "shouldTreatEmptyListAsSuccess"),
    };

    private void writeApiSheet(File file, Map<String, String> results) throws IOException {
        try (XSSFWorkbook wb = open(file)) {
            XSSFSheet sheet = recreateSheet(wb, "Statistics_API");
            XSSFCellStyle header = headerStyle(wb, 197, 217, 160);
            XSSFCellStyle section = headerStyle(wb, 253, 233, 217);
            section.setAlignment(HorizontalAlignment.LEFT);
            XSSFCellStyle data = dataStyle(wb);
            XSSFCellStyle center = centerStyle(wb, data);
            XSSFCellStyle passed = resultStyle(wb, center, 198, 239, 206, 0, 97, 0);
            XSSFCellStyle failed = resultStyle(wb, center, 255, 199, 206, 156, 0, 6);

            fillHeader(sheet, header, 9, 10, 13);
            XSSFRow top = sheet.getRow(9);
            XSSFRow sub = sheet.getRow(10);
            String[] labels = {"ID", "Item", "Testcase Name", "Precondition Test Case", "Test data", "Request", "", "Expected Response", "", "Expected Database", "Result", "Execution", "Note"};
            for (int c = 0; c < labels.length; c++) {
                top.getCell(c).setCellValue(labels[c]);
            }
            sub.getCell(5).setCellValue("params");
            sub.getCell(6).setCellValue("body");
            sub.getCell(7).setCellValue("Status code");
            sub.getCell(8).setCellValue("Body");
            merge(sheet, "9:10:0:0", "9:10:1:1", "9:10:2:2", "9:10:3:3", "9:10:4:4", "9:9:5:6", "9:9:7:8",
                    "9:10:9:9", "9:10:10:10", "9:10:11:11", "9:10:12:12");

            int rowIndex = 11;
            rowIndex = writeSection(sheet, section, rowIndex, "API trang Thống kê (Statistics & Export)");
            rowIndex = writeApiRows(sheet, rowIndex, API_CASES, results, data, center, passed, failed);
            rowIndex = writeSection(sheet, section, rowIndex, "Logic tầng Service (Statistics, Export, Đồng bộ reply)");
            writeApiRows(sheet, rowIndex, LOGIC_CASES, results, data, center, passed, failed);

            widths(sheet, 3000, 3800, 9000, 7500, 6500, 3000, 2500, 3800, 9000, 6000, 2800, 2800, 7500);
            save(wb, file);
        }
    }

    private static int writeSection(XSSFSheet sheet, XSSFCellStyle style, int rowIndex, String title) {
        XSSFRow row = sheet.createRow(rowIndex);
        row.setHeightInPoints(22);
        for (int c = 0; c < 13; c++) {
            row.createCell(c).setCellStyle(style);
        }
        row.getCell(0).setCellValue(title);
        sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 0, 12));
        return rowIndex + 1;
    }

    private static int writeApiRows(XSSFSheet sheet, int startRow, String[][] cases, Map<String, String> results,
                                    XSSFCellStyle data, XSSFCellStyle center,
                                    XSSFCellStyle passed, XSSFCellStyle failed) {
        int rowIndex = startRow;
        for (String[] tc : cases) {
            String method = tc[10];
            String result = results.get(method);
            if (result == null) {
                throw new IllegalStateException("Chưa có kết quả test cho " + method + ", hãy chạy test thống kê trước");
            }
            XSSFRow row = sheet.createRow(rowIndex++);
            row.setHeightInPoints(34);
            for (int j = 0; j < 10; j++) {
                write(row, j, tc[j], j == 0 || j == 1 || j == 7 ? center : data);
            }
            write(row, 10, result, "Passed".equals(result) ? passed : failed);
            write(row, 11, "Auto", center);
            write(row, 12, method, data);
        }
        return rowIndex;
    }

    /* ── Screen ── */

    private static String[] screen(String id, String sub, String type, String pre, String desc, String steps, String expected) {
        return new String[]{id, "Trang Thống kê", sub, type, pre, desc, steps, expected};
    }

    private static final String ON_PAGE = "Đã đăng nhập Threads, đang ở " + URL;

    private static final String[][] SCREEN_CASES = {
            screen("ST-SC-001", "Giao diện", "UI", ON_PAGE, "Hiển thị đầy đủ các khu vực", "1. Mở tab Thống kê\n2. Quan sát trang", "Có tiêu đề, dropdown bài viết, 4 thẻ số liệu, biểu đồ cảm xúc, biểu đồ xu hướng, từ khóa, khu vực xuất báo cáo; không có phần hiệu năng mô hình"),
            screen("ST-SC-002", "Trạng thái tải", "UI", "Đã đăng nhập Threads", "Hiển thị khi đang tải", "1. Mở tab Thống kê trên mạng chậm", "Hiện Đang tải thống kê..., không hiện số liệu của bài trước"),
            screen("ST-SC-003", "Chưa có bài viết", "UI", "Tài khoản không có bài viết", "Trạng thái rỗng", "1. Mở tab Thống kê", "Hiện Chưa có bài viết nào để thống kê, không lỗi"),
            screen("ST-SC-004", "Chọn bài viết", "Function", ON_PAGE + ", tài khoản có từ 2 bài", "Đổi bài viết", "1. Chọn bài khác trong dropdown", "Số liệu đổi đúng theo bài đã chọn"),
            screen("ST-SC-005", "Bài chưa có reply", "UI", "Bài không có reply trên Threads", "Trạng thái rỗng của bài", "1. Chọn bài", "Huy hiệu Chưa có reply, các số bằng 0, biểu đồ báo chưa có dữ liệu, nút xuất bị vô hiệu hóa"),
            screen("ST-SC-006", "Đồng bộ reply", "Function", "Bài có reply trên Threads, chưa mở tab Bình luận", "Tự lấy reply khi mở trang", "1. Mở tab Thống kê\n2. Chọn bài", "Tổng replies khớp số reply lấy được, huy hiệu Chưa phân tích"),
            screen("ST-SC-007", "Phân tích ngay", "Function", "Bài có reply chưa phân tích, AI Service đang chạy", "Phân tích từ trang Thống kê", "1. Bấm Phân tích ngay", "Nút hiện Đang phân tích..., dropdown bị khóa; xong thì số liệu cập nhật, huy hiệu Đã chốt số, nút biến mất"),
            screen("ST-SC-008", "Phân tích ngay", "Error", "Bài có reply chưa phân tích, AI Service tắt", "Báo lỗi khi AI Service tắt", "1. Bấm Phân tích ngay", "Hiện thông báo lỗi đỏ, số liệu cũ giữ nguyên, có thể bấm lại"),
            screen("ST-SC-009", "Threads lỗi", "Error", "Token Threads hết hạn", "Cảnh báo khi không đồng bộ được", "1. Mở tab Thống kê", "Hiện cảnh báo Không lấy được reply từ Threads, vẫn hiển thị dữ liệu đã lưu"),
            screen("ST-SC-010", "Thẻ số liệu", "Business", "Bài đã phân tích", "Số liệu khớp dữ liệu", "1. So sánh 4 thẻ với tab Bình luận", "Tổng, đã phân tích, toxic, hate khớp; thanh tiến độ đúng tỷ lệ"),
            screen("ST-SC-011", "Biểu đồ cảm xúc", "UI", "Bài đã phân tích", "Biểu đồ khớp số liệu", "1. Quan sát biểu đồ tròn và chú thích", "Tâm hiện sắc thái lớn nhất, 3 dòng chú thích đúng số lượng và %"),
            screen("ST-SC-012", "Biểu đồ xu hướng", "UI", "Bài đã phân tích, có reply ở nhiều thời điểm", "Trục thời gian theo dữ liệu", "1. Quan sát biểu đồ", "Đường đi lên hoặc đi ngang, nhãn thời gian đúng, mốc cuối là reply cuối"),
            screen("ST-SC-013", "Từ khóa", "UI", "Bài đã phân tích, nhiều bình luận chung từ", "Hiển thị từ khóa", "1. Quan sát khu vực từ khóa", "Tối đa 8 từ khóa, không có stopword; xanh là tích cực, đỏ là tiêu cực"),
            screen("ST-SC-014", "Xuất CSV", "Function", "Bài có reply", "Tải và mở bằng Excel", "1. Chọn .CSV\n2. Bấm Xuất dữ liệu báo cáo\n3. Mở file bằng Excel", "Tải về thong-ke-{id}.csv, tiếng Việt hiển thị đúng"),
            screen("ST-SC-015", "Xuất JSON", "Function", "Bài có reply", "Tải file JSON", "1. Chọn .JSON\n2. Bấm Xuất dữ liệu báo cáo", "File JSON hợp lệ, có đủ bình luận và nhãn"),
            screen("ST-SC-016", "Xuất XLSX", "Function", "Bài có reply", "Tải và mở file XLSX", "1. Chọn .XLSX\n2. Bấm Xuất dữ liệu báo cáo\n3. Mở file", "File mở được, độ tin cậy ở dạng số"),
            screen("ST-SC-017", "Phân quyền", "Security", "Chưa đăng nhập", "Chặn truy cập", "1. Mở trực tiếp " + URL, "Không hiển thị dữ liệu của người khác; chuyển về đăng nhập hoặc báo lỗi"),
    };

    private void writeScreenSheet(File file) throws IOException {
        try (XSSFWorkbook wb = open(file)) {
            XSSFSheet sheet = recreateSheet(wb, "Statistics_Screen");
            XSSFCellStyle header = headerStyle(wb, 189, 215, 238);
            XSSFCellStyle data = dataStyle(wb);
            XSSFCellStyle center = centerStyle(wb, data);

            fillHeader(sheet, header, 12, 13, 11);
            XSSFRow top = sheet.getRow(12);
            String[] labels = {"No.", "Main Category", "Sub Category", "Type", "Pre Conditions", "Test Descriptions", "Steps", "Expected Result", "Testing result", "", "Remarks"};
            for (int c = 0; c < labels.length; c++) {
                top.getCell(c).setCellValue(labels[c]);
            }
            sheet.getRow(13).getCell(8).setCellValue("Chrome");
            sheet.getRow(13).getCell(9).setCellValue("Execution");
            merge(sheet, "12:13:0:0", "12:13:1:1", "12:13:2:2", "12:13:3:3", "12:13:4:4", "12:13:5:5", "12:13:6:6",
                    "12:13:7:7", "12:12:8:9", "12:13:10:10");

            for (int i = 0; i < SCREEN_CASES.length; i++) {
                XSSFRow row = sheet.createRow(14 + i);
                row.setHeightInPoints(48);
                String[] tc = SCREEN_CASES[i];
                for (int j = 0; j < tc.length; j++) {
                    write(row, j, tc[j], j == 0 || j == 3 ? center : data);
                }
                write(row, 8, "Untested", center);
                write(row, 9, "Manual", center);
                write(row, 10, "Cần kiểm thử thủ công trên trình duyệt", data);
            }
            widths(sheet, 3000, 4500, 4000, 2500, 7000, 7000, 8000, 11000, 2800, 2800, 6000);
            save(wb, file);
        }
    }

    /* ── Helpers ── */

    private static XSSFWorkbook open(File file) throws IOException {
        if (!file.exists()) {
            throw new FileNotFoundException(file.getPath());
        }
        try (FileInputStream in = new FileInputStream(file)) {
            return new XSSFWorkbook(in);
        }
    }

    private static XSSFSheet recreateSheet(XSSFWorkbook wb, String name) {
        int existing = wb.getSheetIndex(name);
        if (existing != -1) {
            wb.removeSheetAt(existing);
        }
        return wb.createSheet(name);
    }

    private static void save(XSSFWorkbook wb, File file) throws IOException {
        try (FileOutputStream out = new FileOutputStream(file)) {
            wb.write(out);
        }
    }

    private static void write(XSSFRow row, int column, String value, XSSFCellStyle style) {
        row.createCell(column).setCellValue(value);
        row.getCell(column).setCellStyle(style);
    }

    private static void fillHeader(XSSFSheet sheet, XSSFCellStyle style, int firstRow, int secondRow, int columns) {
        for (int r : new int[]{firstRow, secondRow}) {
            XSSFRow row = sheet.createRow(r);
            row.setHeightInPoints(22);
            for (int c = 0; c < columns; c++) {
                row.createCell(c).setCellStyle(style);
            }
        }
    }

    /** Mỗi vùng có dạng "dòngĐầu:dòngCuối:cộtĐầu:cộtCuối". */
    private static void merge(XSSFSheet sheet, String... regions) {
        List<CellRangeAddress> ranges = new ArrayList<>();
        for (String region : regions) {
            String[] p = region.split(":");
            ranges.add(new CellRangeAddress(Integer.parseInt(p[0]), Integer.parseInt(p[1]),
                    Integer.parseInt(p[2]), Integer.parseInt(p[3])));
        }
        ranges.forEach(sheet::addMergedRegion);
    }

    private static void widths(XSSFSheet sheet, int... widths) {
        for (int c = 0; c < widths.length; c++) {
            sheet.setColumnWidth(c, widths[c]);
        }
    }

    private static XSSFColor color(int r, int g, int b) {
        return new XSSFColor(new byte[]{(byte) r, (byte) g, (byte) b}, null);
    }

    private static void borders(XSSFCellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private static XSSFFont font(XSSFWorkbook wb, boolean bold, int size) {
        XSSFFont font = wb.createFont();
        font.setBold(bold);
        font.setFontName("Calibri");
        font.setFontHeightInPoints((short) size);
        return font;
    }

    private static XSSFCellStyle headerStyle(XSSFWorkbook wb, int r, int g, int b) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font(wb, true, 10));
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(color(r, g, b));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        borders(style);
        return style;
    }

    private static XSSFCellStyle dataStyle(XSSFWorkbook wb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font(wb, false, 9));
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        borders(style);
        return style;
    }

    private static XSSFCellStyle centerStyle(XSSFWorkbook wb, XSSFCellStyle data) {
        XSSFCellStyle style = wb.createCellStyle();
        style.cloneStyleFrom(data);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private static XSSFCellStyle resultStyle(XSSFWorkbook wb, XSSFCellStyle center,
                                             int r, int g, int b, int textR, int textG, int textB) {
        XSSFCellStyle style = wb.createCellStyle();
        style.cloneStyleFrom(center);
        style.setFillForegroundColor(color(r, g, b));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont font = font(wb, true, 9);
        font.setColor(color(textR, textG, textB));
        style.setFont(font);
        return style;
    }
}
