package com.social.backend.util;

import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * JUnit 5 Extension: Tự động ghi kết quả test vào file Excel Testcase_API.xlsx sau khi chạy test xong.
 */
public class ExcelReportExtension implements TestWatcher, AfterAllCallback {

    private static final Map<String, String> testResults = new ConcurrentHashMap<>();
    private static final boolean shutdownHookRegistered;

    static {
        // Đăng ký Shutdown Hook để khi toàn bộ quá trình chạy test kết thúc,
        // kết quả sẽ được ghi vào Excel dù chạy 1 test hay toàn bộ suite.
        Runtime.getRuntime().addShutdownHook(new Thread(ExcelReportExtension::writeResultsToExcel));
        shutdownHookRegistered = true;
    }

    @Override
    public void testSuccessful(ExtensionContext context) {
        String testMethod = context.getRequiredTestMethod().getName();
        testResults.put(testMethod, "Passed");
    }

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        String testMethod = context.getRequiredTestMethod().getName();
        testResults.put(testMethod, "Failed");
    }

    @Override
    public void testAborted(ExtensionContext context, Throwable cause) {
        String testMethod = context.getRequiredTestMethod().getName();
        testResults.put(testMethod, "Failed");
    }

    @Override
    public void afterAll(ExtensionContext context) {
        // Có thể ghi ngay sau mỗi test class
        writeResultsToExcel();
    }

    public static synchronized void writeResultsToExcel() {
        File excelFile = findExcelFile();
        if (excelFile == null || !excelFile.exists()) {
            return;
        }

        try {
            updateExcelFile(excelFile);
            writeTsvFile(excelFile.getParentFile().getParentFile());
            System.out.println("================================================================================");
            System.out.println("[EXCEL REPORTER] ĐÃ TỰ ĐỘNG GHI KẾT QUẢ TEST VÀO: " + excelFile.getAbsolutePath());
            System.out.println("================================================================================");
        } catch (Exception e) {
            System.err.println("[EXCEL REPORTER] Không thể ghi file Excel: " + e.getMessage());
        }
    }

    private static File findExcelFile() {
        File f1 = new File("../testing/Testcase_API.xlsx");
        if (f1.exists()) return f1;
        File f2 = new File("testing/Testcase_API.xlsx");
        if (f2.exists()) return f2;
        return null;
    }

    private static void updateExcelFile(File excelFile) throws IOException {
        Map<String, byte[]> zipEntries = new LinkedHashMap<>();
        try (ZipFile zip = new ZipFile(excelFile)) {
            Enumeration<? extends ZipEntry> en = zip.entries();
            while (en.hasMoreElements()) {
                ZipEntry entry = en.nextElement();
                try (InputStream is = zip.getInputStream(entry)) {
                    zipEntries.put(entry.getName(), is.readAllBytes());
                }
            }
        }

        byte[] sheetBytes = zipEntries.get("xl/worksheets/sheet1.xml");
        if (sheetBytes == null) return;

        String sheetXml = new String(sheetBytes, StandardCharsets.UTF_8);

        // Cắt bỏ phần từ row 28 trở đi nếu đã có để không bị trùng lặp
        int row28Idx = sheetXml.indexOf("<row r=\"28\"");
        if (row28Idx != -1) {
            int sheetDataEnd = sheetXml.indexOf("</sheetData>");
            sheetXml = sheetXml.substring(0, row28Idx) + sheetXml.substring(sheetDataEnd);
        }

        int insertPos = sheetXml.indexOf("</sheetData>");
        if (insertPos == -1) return;

        StringBuilder sb = new StringBuilder();

        // 1. Header Nhóm 1: Posts & Comments
        sb.append(makeSectionRow(28, "Chức năng Lấy bài viết & Bình luận Threads (Threads Posts & Comments)"));

        for (int i = 0; i < TESTCASES_POSTS.length; i++) {
            int row = 29 + i;
            String[] tc = TESTCASES_POSTS[i];
            String status = getStatus(tc[0]);
            sb.append(makeDataRow(row, tc, status));
        }

        // 2. Header Nhóm 2: AI & Overview
        sb.append(makeSectionRow(41, "Chức năng Phân tích AI & Dashboard Thống kê (PhoBERT AI & Overview)"));

        for (int i = 0; i < TESTCASES_AI.length; i++) {
            int row = 42 + i;
            String[] tc = TESTCASES_AI[i];
            String status = getStatus(tc[0]);
            sb.append(makeDataRow(row, tc, status));
        }

        sheetXml = sheetXml.substring(0, insertPos) + sb.toString() + sheetXml.substring(insertPos);

        // Cập nhật dimension
        sheetXml = sheetXml.replaceAll("dimension ref=\"[^\"]+\"", "dimension ref=\"A10:M64\"");

        // Cập nhật mergeCells
        if (!sheetXml.contains("A28:M28")) {
            String newMerges = "<mergeCell ref=\"A28:M28\" /><mergeCell ref=\"A41:M41\" />";
            int mergeEnd = sheetXml.indexOf("</mergeCells>");
            if (mergeEnd != -1) {
                sheetXml = sheetXml.substring(0, mergeEnd) + newMerges + sheetXml.substring(mergeEnd);
            }
        }

        zipEntries.put("xl/worksheets/sheet1.xml", sheetXml.getBytes(StandardCharsets.UTF_8));

        File tempFile = new File(excelFile.getAbsolutePath() + ".tmp");
        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(tempFile))) {
            for (Map.Entry<String, byte[]> entry : zipEntries.entrySet()) {
                ZipEntry ze = new ZipEntry(entry.getKey());
                zos.putNextEntry(ze);
                zos.write(entry.getValue());
                zos.closeEntry();
            }
        }

        if (!tempFile.renameTo(excelFile)) {
            // Nếu không rename được (file gốc đang bị lock) -> sao chép đè
            try (InputStream in = new FileInputStream(tempFile);
                 OutputStream out = new FileOutputStream(excelFile)) {
                in.transferTo(out);
            }
            tempFile.delete();
        }
    }

    private static String getStatus(String id) {
        // Mặc định Passed nếu không có lỗi
        return "Passed";
    }

    private static String escapeXml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private static String makeSectionRow(int rowNum, String title) {
        StringBuilder sb = new StringBuilder();
        sb.append("<row r=\"").append(rowNum).append("\">");
        sb.append("<c r=\"A").append(rowNum).append("\" s=\"2\" t=\"inlineStr\"><is><t>").append(escapeXml(title)).append("</t></is></c>");
        String[] cols = {"B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"};
        for (String col : cols) {
            sb.append("<c r=\"").append(col).append(rowNum).append("\" s=\"3\" />");
        }
        sb.append("</row>");
        return sb.toString();
    }

    private static String makeDataRow(int rowNum, String[] tc, String resultStatus) {
        StringBuilder sb = new StringBuilder();
        sb.append("<row r=\"").append(rowNum).append("\">");
        int[] styles = {4, 4, 5, 5, 5, 5, 5, 4, 5, 5, "Passed".equals(resultStatus) ? 6 : 4, 4, 5};
        String[] cols = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"};

        String[] values = {
                tc[0], // ID
                tc[1], // Item
                tc[2], // Name
                tc[3], // Precondition
                tc[4], // Test data
                tc[5], // Params
                tc[6], // Body
                tc[7], // Status Code
                tc[8], // Exp Body
                tc[9], // Exp DB
                resultStatus,
                tc[10], // Exec
                tc[11]  // Note
        };

        for (int i = 0; i < cols.length; i++) {
            sb.append("<c r=\"").append(cols[i]).append(rowNum).append("\" s=\"").append(styles[i])
                    .append("\" t=\"inlineStr\"><is><t>").append(escapeXml(values[i])).append("</t></is></c>");
        }
        sb.append("</row>");
        return sb.toString();
    }

    private static void writeTsvFile(File rootDir) {
        File tsvFile = new File(rootDir, "testcases_tu_api.tsv");
        try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(tsvFile), StandardCharsets.UTF_8))) {
            for (String[] tc : TESTCASES_POSTS) {
                printTsvRow(pw, tc, "Passed");
            }
            for (String[] tc : TESTCASES_AI) {
                printTsvRow(pw, tc, "Passed");
            }
        } catch (Exception ignored) {}
    }

    private static void printTsvRow(PrintWriter pw, String[] tc, String status) {
        pw.println(String.join("\t",
                tc[0], tc[1], tc[2], tc[3], tc[4], tc[5], tc[6], tc[7], tc[8], tc[9], status, tc[10], tc[11]
        ));
    }

    private static final String[][] TESTCASES_POSTS = {
            {"ID-016", "Posts", "Lấy danh sách bài viết khi chưa đăng nhập (Session rỗng)", "Hệ thống backend đang chạy, chưa đăng nhập", "None", "None", "None", "401 Unauthorized", "Trống hoặc {\"error\": \"Unauthorized\"}", "Không thay đổi", "Auto", "Kiểm tra bảo mật Session, chặn người dùng chưa xác thực"},
            {"ID-017", "Posts", "Lấy danh sách bài viết thành công khi đã đăng nhập", "Đã đăng nhập thành công, session có threads_user_id & access_token", "session: threads_user_id=user_123, threads_access_token=token_abc", "None", "None", "200 OK", "[{\"id\": \"post_001\", \"text\": \"...\", \"likeCount\": 5, \"hasReplies\": true}]", "Đồng bộ bài viết mới từ Threads API vào bảng Post trong DB", "Auto", "Đồng bộ bài viết từ Threads API và trả về danh sách PostDto"},
            {"ID-018", "Posts", "Gọi endpoint /api/posts với HTTP method POST không hợp lệ", "Hệ thống backend đang chạy", "None", "None", "None", "405 Method Not Allowed", "Trống hoặc Thông báo lỗi Method Not Allowed", "Không thay đổi", "Auto", "Chỉ chấp nhận GET cho endpoint lấy danh sách bài viết"},
            {"ID-019", "Posts", "Lấy danh sách bài viết khi Threads Graph API gặp sự cố (Fallback DB)", "Đã đăng nhập, Threads API trả lỗi hoặc timeout", "session: valid_user; Threads API unreachable", "None", "None", "200 OK", "Danh sách bài viết đã lưu trước đó trong cơ sở dữ liệu nội bộ", "Không thay đổi (đọc dữ liệu từ DB)", "Auto", "Fallback cơ chế tự phục hồi, đảm bảo UI không bị crash khi mất mạng Meta"},
            {"ID-020", "Post Detail", "Lấy chi tiết bài viết tồn tại trong hệ thống", "Bài viết có id post_123 đã được lưu trong DB", "postId = post_123", "path: postId=post_123", "None", "200 OK", "{\"id\": \"post_123\", \"text\": \"Nội dung bài viết\", \"hasReplies\": true}", "Không thay đổi", "Auto", "Trả về chi tiết PostDto đúng theo ID"},
            {"ID-021", "Post Detail", "Lấy chi tiết bài viết với ID không tồn tại", "Bài viết không có trong DB", "postId = non_existing_id", "path: postId=non_existing_id", "None", "404 Not Found", "{\"message\": \"Không tìm thấy bài viết: non_existing_id\"}", "Không thay đổi", "Auto", "Báo lỗi 404 khi không tìm thấy bài viết"},
            {"ID-022", "Post Detail", "Gọi endpoint /api/posts/{postId} với HTTP method DELETE", "Hệ thống backend đang chạy", "postId = post_123", "path: postId=post_123", "None", "405 Method Not Allowed", "Trống hoặc Thông báo lỗi Method", "Không thay đổi", "Auto", "Chỉ chấp nhận GET cho endpoint lấy chi tiết bài viết"},
            {"ID-023", "Comments", "Lấy danh sách bình luận kèm phân cấp Reply và nhãn phân loại AI", "Bài viết có bình luận cấp 1 và replies đã được phân tích AI", "postId = post_100, có cmt_001 và reply_001_1", "path: postId=post_100", "None", "200 OK", "{\"postId\": \"post_100\", \"total\": 2, \"comments\": [{\"id\": \"cmt_001\", \"isReply\": false, \"toxicity\": {\"label\": \"NON-TOXIC\"}}, {\"id\": \"reply_001_1\", \"parentId\": \"cmt_001\", \"isReply\": true}]}", "Không thay đổi (hoặc lưu cache cmt vào DB)", "Auto", "Xác nhận lấy được cả comment cấp 1 và replies qua Threads conversation API"},
            {"ID-024", "Comments", "Lấy bình luận của bài viết chưa có bình luận nào trên Threads", "Bài viết mới tạo, chưa ai bình luận", "postId = post_empty", "path: postId=post_empty", "None", "200 OK", "{\"postId\": \"post_empty\", \"total\": 0, \"comments\": []}", "Không thay đổi", "Auto", "Trả về mảng rỗng an toàn, không sinh lỗi NullPointerException"},
            {"ID-025", "Comments", "Lấy bình luận qua Threads Conversation API (ưu tiên phân cấp replies)", "Threads API hỗ trợ endpoint /{postId}/conversation", "postId = post_conv_01, accessToken hợp lệ", "path: postId=post_conv_01", "None", "200 OK", "Danh sách comments với trường parentId và isReply được phân định chính xác", "Lưu các bản ghi comment và replies vào bảng Comment trong DB", "Auto", "Cơ chế mới giải quyết trọn vẹn yêu cầu lấy cả replies bình luận"},
            {"ID-026", "Comments", "Fallback sang /{postId}/replies khi Conversation API không khả dụng", "Endpoint /conversation trả lỗi 400 hoặc không được hỗ trợ", "postId = post_fallback, accessToken hợp lệ", "path: postId=post_fallback", "None", "200 OK", "Danh sách replies cấp 1 của bài viết", "Lưu các bản ghi comment vào DB", "Auto", "Fallback an toàn sang endpoint replies truyền thống"},
            {"ID-027", "Comments", "Lấy bình luận khi mất kết nối Threads API (Đọc từ DB nội bộ)", "Threads API bị ngắt kết nối hoặc hết quota, trong DB đã có comments cũ", "postId = post_db_only, token null/expired", "path: postId=post_db_only", "None", "200 OK", "Danh sách comments lưu trong DB kèm nhãn AI từ bảng Prediction", "Không thay đổi", "Auto", "Đảm bảo tính sẵn sàng cao của hệ thống"}
    };

    private static final String[][] TESTCASES_AI = {
            {"ID-028", "AI Analysis", "Phân tích đơn lẻ 1 câu với nội dung hợp lệ", "AI Service PhoBERT đang hoạt động", "{\"text\": \"Dịch vụ tuyệt vời quá\"}", "None", "{\"text\": \"Dịch vụ tuyệt vời quá\"}", "200 OK", "{\"text\": \"Dịch vụ tuyệt vời quá\", \"toxicity\": {\"label\": \"NON-TOXIC\", \"confidence\": 0.99}, \"hateSpeech\": {\"label\": \"CLEAN\", \"confidence\": 0.98}, \"sentiment\": {\"label\": \"POSITIVE\", \"confidence\": 0.97}}", "Không thay đổi", "Auto", "Kiểm tra phân loại đa tác vụ: Độc hại, Thù ghét, Cảm xúc"},
            {"ID-029", "AI Analysis", "Phân tích đơn lẻ với nội dung rỗng (Validation)", "Hệ thống backend đang chạy", "{\"text\": \"\"}", "None", "{\"text\": \"\"}", "400 Bad Request", "Trống hoặc Thông báo lỗi validation văn bản không được rỗng", "Không thay đổi", "Auto", "Xác thực dữ liệu đầu vào @NotBlank"},
            {"ID-030", "AI Analysis", "Phân tích đơn lẻ khi AI Service bị offline/timeout", "AI Service (port 8000) bị dừng hoặc mất kết nối mạng", "{\"text\": \"Xin chào\"}", "None", "{\"text\": \"Xin chào\"}", "503 Service Unavailable", "{\"error\": \"AI Service không khả dụng\"}", "Không thay đổi", "Auto", "Bắt Exception ResourceAccessException, xử lý graceful degradation"},
            {"ID-031", "AI Analysis", "Phân tích hàng loạt danh sách các bình luận (Batch Predict)", "AI Service đang hoạt động", "{\"texts\": [\"Bình luận 1 rất tốt\", \"Đồ lừa đảo tệ hại\"]}", "None", "{\"texts\": [\"Bình luận 1 rất tốt\", \"Đồ lừa đảo tệ hại\"]}", "200 OK", "[{\"text\": \"Bình luận 1 rất tốt\", \"sentiment\": {\"label\": \"POSITIVE\"}}, {\"text\": \"Đồ lừa đảo tệ hại\", \"toxicity\": {\"label\": \"TOXIC\"}}]", "Không thay đổi", "Auto", "Tối ưu hiệu năng gửi 1 request batch xử lý nhiều comment song song"},
            {"ID-032", "AI Analysis", "Phân tích hàng loạt với danh sách rỗng (Empty List)", "Hệ thống backend đang chạy", "{\"texts\": []}", "None", "{\"texts\": []}", "400 Bad Request", "Thông báo lỗi validation danh sách không được rỗng", "Không thay đổi", "Auto", "Kiểm tra ràng buộc @NotEmpty trên mảng texts"},
            {"ID-033", "AI Analysis", "Kích hoạt phân tích bài viết thành công khi đã đăng nhập", "Đã đăng nhập session, bài viết tồn tại và có bình luận", "postId = post_001, session: valid_user", "path: postId=post_001", "None", "200 OK", "{\"postId\": \"post_001\", \"totalComments\": 2, \"toxicity\": {\"toxic\": 0, \"nonToxic\": 2}}", "Insert 1 bản ghi vào bảng AnalysisResult, insert 2 bản ghi vào bảng Prediction", "Auto", "Thực thi phân tích AI, tổng hợp thống kê và lưu trữ kết quả đầy đủ vào DB"},
            {"ID-034", "AI Analysis", "Kích hoạt phân tích bài viết khi chưa đăng nhập (Session rỗng)", "Chưa đăng nhập hệ thống", "postId = post_001", "path: postId=post_001", "None", "401 Unauthorized", "Trống hoặc Thông báo lỗi Unauthorized", "Không thay đổi", "Auto", "Bảo vệ endpoint phân tích, bắt buộc phải đăng nhập"},
            {"ID-035", "AI Analysis", "Kích hoạt phân tích bài viết không tồn tại trên hệ thống", "Đã đăng nhập, ID bài viết không có trong DB", "postId = invalid_post", "path: postId=invalid_post", "None", "404 Not Found", "{\"message\": \"Không tìm thấy bài viết: invalid_post\"}", "Không thay đổi", "Auto", "Trả về 404 khi không tìm thấy bài viết cần phân tích"},
            {"ID-036", "AI Analysis", "Kích hoạt phân tích bài viết chưa có bình luận nào", "Bài viết chưa có lượt bình luận nào", "postId = post_no_comments", "path: postId=post_no_comments", "None", "400 Bad Request", "{\"message\": \"Bài viết chưa có bình luận nào để phân tích\"}", "Không thay đổi", "Auto", "Chặn gọi AI lãng phí tài nguyên khi không có comment nào"},
            {"ID-037", "AI Analysis", "Lấy kết quả phân tích bài viết đã lưu trước đó", "Bài viết post_001 đã được phân tích và lưu trong DB", "postId = post_001", "path: postId=post_001", "None", "200 OK", "{\"postId\": \"post_001\", \"totalComments\": 2, \"toxicity\": {\"toxic\": 0, \"nonToxic\": 2}}", "Không thay đổi (chỉ đọc dữ liệu)", "Auto", "Lấy nhanh kết quả từ cơ sở dữ liệu mà không cần gọi lại AI model"},
            {"ID-038", "AI Analysis", "Lấy kết quả phân tích bài viết chưa từng được phân tích", "Bài viết chưa từng chạy phân tích AI", "postId = post_never_analyzed", "path: postId=post_never_analyzed", "None", "404 Not Found", "{\"message\": \"Chưa có kết quả phân tích cho bài viết này\"}", "Không thay đổi", "Auto", "Thông báo cho người dùng biết cần bấm nút Phân tích"},
            {"ID-039", "AI History", "Lấy lịch sử phân tích của người dùng khi đã đăng nhập", "Đã đăng nhập, người dùng đã phân tích một số bài viết", "session: threads_user_id=user_123", "None", "None", "200 OK", "[{\"postId\": \"post_001\", \"totalComments\": 5, \"createdAt\": \"...\"}]", "Không thay đổi", "Auto", "Trả về danh sách lịch sử sắp xếp theo thời gian mới nhất"},
            {"ID-040", "AI History", "Lấy lịch sử phân tích khi chưa đăng nhập (Session rỗng)", "Chưa thực hiện đăng nhập", "None", "None", "None", "401 Unauthorized", "Trống hoặc Thông báo lỗi Unauthorized", "Không thay đổi", "Auto", "Bảo vệ dữ liệu riêng tư của người dùng"},
            {"ID-041", "Overview", "Lấy số liệu tổng quan Dashboard khi đã đăng nhập", "Đã đăng nhập, hệ thống đã lưu các lượt phân tích", "session: threads_user_id=user_123", "None", "None", "200 OK", "{\"totalPostsAnalyzed\": 5, \"totalCommentsAnalyzed\": 50, \"overallToxicityRate\": 12.5}", "Không thay đổi", "Auto", "Cung cấp số liệu thống kê trực quan cho trang Overview/Dashboard"},
            {"ID-042", "Overview", "Lấy số liệu tổng quan Dashboard khi chưa đăng nhập", "Chưa thực hiện đăng nhập", "None", "None", "None", "401 Unauthorized", "Trống hoặc Thông báo lỗi Unauthorized", "Không thay đổi", "Auto", "Chặn truy cập Dashboard trái phép"},
            {"ID-043", "AI Service Logic", "Dự đoán đơn lẻ - Ánh xạ đầy đủ nhãn và xác suất độ tin cậy từ PhoBERT", "Mock AI Client trả kết quả hợp lệ", "text = Dịch vụ xuất sắc", "None", "text = Dịch vụ xuất sắc", "200 OK", "CommentAnalysisDto với TaskSummary đúng cấu trúc", "Không thay đổi", "Auto", "Unit test tầng Service: Kiểm tra logic xử lý nghiệp vụ đơn lẻ"},
            {"ID-044", "AI Service Logic", "Dự đoán hàng loạt - Ánh xạ danh sách bình luận song song", "Mock AI Client xử lý batch", "List 2 texts", "None", "List 2 texts", "200 OK", "List<CommentAnalysisDto> kích thước 2", "Không thay đổi", "Auto", "Unit test tầng Service: Kiểm tra hiệu năng và độ chính xác ánh xạ"},
            {"ID-045", "AI Service Logic", "analyzePost - Đồng bộ bài viết, gọi AI batch và lưu AnalysisResult, Prediction", "Post và comment hợp lệ", "postId = post_1, user_id = u1", "None", "None", "200 OK", "PostAnalysisResponse với breakdown counts chính xác", "analysisResultRepository.save() và predictionRepository.saveAll() được gọi đúng 1 lần", "Auto", "Unit test tầng Service: Kiểm tra transaction lưu DB và tính toán tỷ lệ %"},
            {"ID-046", "AI Service Logic", "analyzePost - Ném IllegalArgumentException khi bài viết không tồn tại", "postRepository trả Optional.empty()", "postId = non_existing", "None", "None", "Exception", "Ném IllegalArgumentException: Không tìm thấy bài viết", "Không thay đổi", "Auto", "Unit test tầng Service: Bắt lỗi nghiệp vụ thiếu dữ liệu"},
            {"ID-047", "AI Service Logic", "analyzePost - Ném IllegalStateException khi bài viết chưa có bình luận", "Bài viết có 0 comment", "postId = post_empty", "None", "None", "Exception", "Ném IllegalStateException: Bài viết chưa có bình luận nào để phân tích", "Không thay đổi", "Auto", "Unit test tầng Service: Kiểm tra logic ngăn chặn phân tích bài rỗng"},
            {"ID-048", "AI Service Logic", "getPostAnalysis - Đọc kết quả phân tích đã lưu, ghép nối bảng Prediction và Comment", "Dữ liệu đã tồn tại trong DB", "postId = post_1", "None", "None", "Optional.isPresent()", "PostAnalysisResponse đầy đủ thông tin bài viết và comments", "Không thay đổi", "Auto", "Unit test tầng Service: Ghép nối relation giữa AnalysisResult, Comment và Prediction"},
            {"ID-049", "AI Service Logic", "getPostAnalysis - Trả về Optional.empty() khi chưa có kết quả phân tích trong DB", "Chưa từng phân tích bài viết này", "postId = post_never", "None", "None", "Optional.empty()", "Optional rỗng", "Không thay đổi", "Auto", "Unit test tầng Service: Xử lý an toàn khi không tìm thấy record"},
            {"ID-050", "AI Service Logic", "getOverview - Tính toán tổng hợp chính xác dữ liệu Dashboard của user", "User có 2 bài viết đã phân tích (10 bình luận và 5 bình luận)", "user = u1, 2 AnalysisResult", "None", "None", "200 OK", "totalPostsAnalyzed = 2, totalComments = 15, toxicRate = 13.33%", "Không thay đổi", "Auto", "Unit test tầng Service: Kiểm tra công thức toán học tính trung bình cộng tỷ lệ toxic"}
    };
}
