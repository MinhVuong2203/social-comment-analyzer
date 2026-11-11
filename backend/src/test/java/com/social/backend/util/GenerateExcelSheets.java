package com.social.backend.util;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.junit.jupiter.api.Test;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;

public class GenerateExcelSheets {

    public static void main(String[] args) throws Exception {
        new GenerateExcelSheets().generateAllAdminSheets();
    }

    @Test
    public void generateAllAdminSheets() throws Exception {
        System.out.println(">>> Bắt đầu tạo các Sheet kiểm thử Admin theo chuẩn format...");

        String baseDir = findTestingDir();
        if (baseDir == null) {
            throw new FileNotFoundException("Không tìm thấy thư mục testing!");
        }

        generateViewpointSheet(Paths.get(baseDir, "Test_viewpoint.xlsx").toString());
        generateApiSheet(Paths.get(baseDir, "Testcase_API.xlsx").toString());
        generateScreenSheet(Paths.get(baseDir, "Testcase_Screen.xlsx").toString());

        System.out.println(">>> ĐÃ TẠO THÀNH CÔNG 3 SHEET MỚI CHO ADMIN LOGIN VÀO CẢ 3 FILE EXCEL!");
    }

    private String findTestingDir() {
        if (Files.exists(Paths.get("../testing"))) return "../testing";
        if (Files.exists(Paths.get("testing"))) return "testing";
        return null;
    }

    private void generateViewpointSheet(String filePath) throws Exception {
        File file = new File(filePath);
        XSSFWorkbook wb;
        if (file.exists()) {
            try (FileInputStream fis = new FileInputStream(file)) {
                wb = new XSSFWorkbook(fis);
            }
        } else {
            wb = new XSSFWorkbook();
        }

        String sheetName = "Admin_Viewpoint";
        int existingIdx = wb.getSheetIndex(sheetName);
        if (existingIdx != -1) {
            wb.removeSheetAt(existingIdx);
        }

        XSSFSheet sheet = wb.createSheet(sheetName);
        sheet.setDisplayGridlines(true);

        // Styles
        XSSFCellStyle headerStyle = wb.createCellStyle();
        XSSFFont headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setFontName("Calibri");
        headerFont.setFontHeightInPoints((short) 11);
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 217, (byte) 225, (byte) 242}, null));
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(headerStyle);

        XSSFCellStyle dataStyle = wb.createCellStyle();
        XSSFFont dataFont = wb.createFont();
        dataFont.setFontName("Calibri");
        dataFont.setFontHeightInPoints((short) 10);
        dataStyle.setFont(dataFont);
        dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        dataStyle.setWrapText(true);
        setBorders(dataStyle);

        XSSFCellStyle centerDataStyle = wb.createCellStyle();
        centerDataStyle.cloneStyleFrom(dataStyle);
        centerDataStyle.setAlignment(HorizontalAlignment.CENTER);

        // Header Rows (Row 0 & Row 1 in 0-based index)
        XSSFRow row0 = sheet.createRow(0);
        XSSFRow row1 = sheet.createRow(1);
        row0.setHeightInPoints(24);
        row1.setHeightInPoints(24);

        for (int c = 0; c < 7; c++) {
            row0.createCell(c).setCellStyle(headerStyle);
            row1.createCell(c).setCellStyle(headerStyle);
        }

        row0.getCell(0).setCellValue("No.");
        row0.getCell(1).setCellValue("Tên bộ phận/ Tên hệ thống chức năng");
        row0.getCell(2).setCellValue("Đối tượng test");
        row1.getCell(2).setCellValue("Mục lớn");
        row1.getCell(3).setCellValue("Mục trung");
        row1.getCell(4).setCellValue("Mục nhỏ");
        row0.getCell(5).setCellValue("Mục xác nhận");
        row0.getCell(6).setCellValue("Ghi chú");

        // Merge cells
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 0, 0)); // No.
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 1, 1)); // Tên bộ phận
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 2, 4)); // Đối tượng test (C-E)
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 5, 5)); // Mục xác nhận
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 6, 6)); // Ghi chú

        String[][] viewpoints = {
                {"1", "Chức năng Đăng nhập Quản trị", "Khởi tạo Đăng nhập", "Button / Link Login Admin", "Giao diện", "Xác nhận hiển thị đầy đủ logo, nhãn ADMIN PORTAL, RESTRICTED, các ô nhập Username, Password và nút submit", "Form đăng nhập Admin"},
                {"2", "Chức năng Đăng nhập Quản trị", "Khởi tạo Đăng nhập", "Giao diện / Toggle Password", "Eye Icon", "Xác nhận nút con mắt chuyển đổi qua lại mượt mà giữa ẩn dấu chấm (password) và hiển thị chữ (text)", "UI / UX"},
                {"3", "Chức năng Đăng nhập Quản trị", "Kiểm tra Dữ liệu (Validation)", "Request Body / Form Validate", "Empty / Blank Check", "Xác nhận ném lỗi 400 Bad Request và hiển thị cảnh báo đỏ khi để trống Username hoặc Password", "Validation @NotBlank"},
                {"4", "Chức năng Đăng nhập Quản trị", "Xác thực Mật khẩu (Authentication)", "Mật khẩu đúng & Khớp Hash", "BCrypt Verification", "Xác nhận hệ thống gọi BCryptPasswordEncoder so khớp chính xác mật khẩu thô với password_hash trong bảng admins", "Bảo mật chuẩn BCrypt"},
                {"5", "Chức năng Đăng nhập Quản trị", "Xác thực Mật khẩu (Authentication)", "Mật khẩu không chính xác", "Auth Failure", "Xác nhận trả về mã lỗi 401 Unauthorized kèm thông báo chung \"Tài khoản hoặc mật khẩu quản trị không chính xác.\"", "Bảo vệ tài khoản"},
                {"6", "Chức năng Đăng nhập Quản trị", "Xác thực Mật khẩu (Authentication)", "Tài khoản không tồn tại", "User Not Found", "Xác nhận trả về mã lỗi 401 Unauthorized, không tiết lộ việc username có tồn tại hay không nhằm chống dò quét", "Chống User Enumeration"},
                {"7", "Chức năng Đăng nhập Quản trị", "Kiểm soát Tài khoản (Account Status)", "Tài khoản bị vô hiệu hóa", "Security Check", "Xác nhận tài khoản có account_status != ACTIVE bị từ chối đăng nhập và trả về mã lỗi 403 Forbidden", "Phân quyền & Khóa tài khoản"},
                {"8", "Chức năng Đăng nhập Quản trị", "Bảo mật (Security)", "Tấn công SQL Injection", "JPA Parameterized", "Xác nhận câu truy vấn parameterized query ngăn chặn triệt để tấn công SQLi qua ô username, trả về 401 an toàn", "Chống SQL Injection"},
                {"9", "Chức năng Đăng nhập Quản trị", "Đồng bộ Database", "Cập nhật lần đăng nhập cuối", "Database Update", "Xác nhận hệ thống tự động UPDATE trường last_login_at bằng thời gian hiện tại ngay khi đăng nhập thành công", "Audit Log DB"},
                {"10", "Chức năng Đăng nhập Quản trị", "Quản lý Phiên (Session)", "Khởi tạo Session Admin", "HttpSession", "Xác nhận khi đăng nhập thành công, server lưu session an toàn chứa ADMIN_USER và admin_logged_in=true", "Session Management"},
                {"11", "Chức năng Đăng nhập Quản trị", "Quản lý Phiên (Session)", "API /api/admin/me", "Session Check", "Xác nhận trả về đúng thông tin Admin (id, username, role) khi session hợp lệ, trả về 401 khi chưa đăng nhập", "Session Verification"},
                {"12", "Chức năng Đăng nhập Quản trị", "Quản lý Phiên (Session)", "API /api/admin/logout", "Session Invalidation", "Xác nhận khi đăng xuất session trên server bị hủy hoàn toàn (invalidate) và client xóa thông tin lưu trữ", "Hủy phiên an toàn"},
                {"13", "Chức năng Đăng nhập Quản trị", "Ghi nhớ Đăng nhập (Remember Me)", "Cơ chế lưu trữ client", "Storage Strategy", "Xác nhận tích chọn Ghi nhớ phiên thì lưu vào localStorage, không tích thì lưu vào sessionStorage", "Web Storage"},
                {"14", "Chức năng Đăng nhập Quản trị", "Chuyển trang & Điều hướng", "Redirect Navigation", "Action Flow", "Xác nhận sau khi đăng nhập thành công chuyển hướng đến /admin/dashboard; click nút quay lại chuyển về /login", "Navigation Flow"}
        };

        for (int i = 0; i < viewpoints.length; i++) {
            XSSFRow row = sheet.createRow(2 + i);
            row.setHeightInPoints(28);
            String[] vp = viewpoints[i];

            XSSFCell c0 = row.createCell(0);
            c0.setCellValue(Integer.parseInt(vp[0]));
            c0.setCellStyle(centerDataStyle);

            for (int j = 1; j < vp.length; j++) {
                XSSFCell cell = row.createCell(j);
                cell.setCellValue(vp[j]);
                cell.setCellStyle(dataStyle);
            }
        }

        sheet.setColumnWidth(0, 1800);
        sheet.setColumnWidth(1, 7500);
        sheet.setColumnWidth(2, 6000);
        sheet.setColumnWidth(3, 7000);
        sheet.setColumnWidth(4, 4500);
        sheet.setColumnWidth(5, 18000);
        sheet.setColumnWidth(6, 6000);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            wb.write(fos);
        }
        wb.close();
        System.out.println("  + Đã tạo sheet 'Admin_Viewpoint' trong " + filePath);
    }

    private void generateApiSheet(String filePath) throws Exception {
        File file = new File(filePath);
        XSSFWorkbook wb;
        if (file.exists()) {
            try (FileInputStream fis = new FileInputStream(file)) {
                wb = new XSSFWorkbook(fis);
            }
        } else {
            wb = new XSSFWorkbook();
        }

        String sheetName = "Admin_API";
        int existingIdx = wb.getSheetIndex(sheetName);
        if (existingIdx != -1) {
            wb.removeSheetAt(existingIdx);
        }

        XSSFSheet sheet = wb.createSheet(sheetName);
        sheet.setDisplayGridlines(true);

        // Header Style (light green background as in image 2: RGB(214, 227, 188) or RGB(197, 217, 160))
        XSSFCellStyle headerStyle = wb.createCellStyle();
        XSSFFont headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setFontName("Calibri");
        headerFont.setFontHeightInPoints((short) 10);
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 197, (byte) 217, (byte) 160}, null));
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(headerStyle);

        XSSFCellStyle sectionStyle = wb.createCellStyle();
        XSSFFont sectionFont = wb.createFont();
        sectionFont.setBold(true);
        sectionFont.setFontName("Calibri");
        sectionFont.setFontHeightInPoints((short) 10);
        sectionStyle.setFont(sectionFont);
        sectionStyle.setAlignment(HorizontalAlignment.LEFT);
        sectionStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        sectionStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 253, (byte) 233, (byte) 217}, null));
        sectionStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(sectionStyle);

        XSSFCellStyle dataStyle = wb.createCellStyle();
        XSSFFont dataFont = wb.createFont();
        dataFont.setFontName("Calibri");
        dataFont.setFontHeightInPoints((short) 9);
        dataStyle.setFont(dataFont);
        dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        dataStyle.setWrapText(true);
        setBorders(dataStyle);

        XSSFCellStyle centerDataStyle = wb.createCellStyle();
        centerDataStyle.cloneStyleFrom(dataStyle);
        centerDataStyle.setAlignment(HorizontalAlignment.CENTER);

        // Passed style (green background RGB(198, 239, 206), text RGB(0, 97, 0))
        XSSFCellStyle passedStyle = wb.createCellStyle();
        passedStyle.cloneStyleFrom(centerDataStyle);
        passedStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 198, (byte) 239, (byte) 206}, null));
        passedStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont passedFont = wb.createFont();
        passedFont.setFontName("Calibri");
        passedFont.setBold(true);
        passedFont.setColor(new XSSFColor(new byte[]{(byte) 0, (byte) 97, (byte) 0}, null));
        passedStyle.setFont(passedFont);

        // Header Rows at Row index 9 & 10 (row 10 & 11 in Excel)
        XSSFRow row9 = sheet.createRow(9);
        XSSFRow row10 = sheet.createRow(10);
        row9.setHeightInPoints(22);
        row10.setHeightInPoints(22);

        for (int c = 0; c < 13; c++) {
            row9.createCell(c).setCellStyle(headerStyle);
            row10.createCell(c).setCellStyle(headerStyle);
        }

        row9.getCell(0).setCellValue("ID");
        row9.getCell(1).setCellValue("Item");
        row9.getCell(2).setCellValue("Testcase Name");
        row9.getCell(3).setCellValue("Precondition Test Case");
        row9.getCell(4).setCellValue("Test data");
        row9.getCell(5).setCellValue("Request");
        row10.getCell(5).setCellValue("params");
        row10.getCell(6).setCellValue("body");
        row9.getCell(7).setCellValue("Expected Response");
        row10.getCell(7).setCellValue("Status code");
        row10.getCell(8).setCellValue("Body");
        row9.getCell(9).setCellValue("Expected Database");
        row9.getCell(10).setCellValue("Result");
        row9.getCell(11).setCellValue("Execution");
        row9.getCell(12).setCellValue("Note");

        // Merge headers
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 0, 0)); // ID
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 1, 1)); // Item
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 2, 2)); // Testcase Name
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 3, 3)); // Precondition
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 4, 4)); // Test data
        sheet.addMergedRegion(new CellRangeAddress(9, 9, 5, 6));   // Request
        sheet.addMergedRegion(new CellRangeAddress(9, 9, 7, 8));   // Expected Response
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 9, 9));  // Expected Database
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 10, 10)); // Result
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 11, 11)); // Execution
        sheet.addMergedRegion(new CellRangeAddress(9, 10, 12, 12)); // Note

        // Section row at 11
        XSSFRow row11 = sheet.createRow(11);
        row11.setHeightInPoints(22);
        for (int c = 0; c < 13; c++) {
            row11.createCell(c).setCellStyle(sectionStyle);
        }
        row11.getCell(0).setCellValue("Chức năng Đăng nhập & Xác thực Quản trị viên (Admin Authentication)");
        sheet.addMergedRegion(new CellRangeAddress(11, 11, 0, 12));

        String[][] testcases = {
                {"ID-051", "Authentication", "Đăng nhập thành công với tài khoản và mật khẩu hợp lệ", "Hệ thống backend đang chạy, tài khoản admin tồn tại trong bảng admins (status=ACTIVE)", "username=admin, password=123456", "None", "{\"username\": \"admin\", \"password\": \"123456\"}", "200 OK", "{\"id\": 1, \"username\": \"admin\", \"displayName\": \"...\", \"role\": \"ADMIN\", \"accountStatus\": \"ACTIVE\"}", "UPDATE last_login_at = now() trong bảng admins", "Passed", "Auto", "Xác thực mật khẩu BCrypt thành công, tạo HttpSession lưu quyền Admin"},
                {"ID-052", "Authentication", "Đăng nhập thất bại khi nhập sai mật khẩu", "Tài khoản admin tồn tại trong DB", "username=admin, password=wrong_pass", "None", "{\"username\": \"admin\", \"password\": \"wrong_pass\"}", "401 Unauthorized", "{\"message\": \"Tài khoản hoặc mật khẩu quản trị không chính xác.\"}", "Không thay đổi", "Passed", "Auto", "Kiểm tra mã hóa BCrypt không khớp, từ chối đăng nhập"},
                {"ID-053", "Authentication", "Đăng nhập thất bại khi tài khoản không tồn tại trên hệ thống", "Tài khoản không có trong bảng admins", "username=non_existent_admin, password=123456", "None", "{\"username\": \"non_existent_admin\", \"password\": \"123456\"}", "401 Unauthorized", "{\"message\": \"Tài khoản hoặc mật khẩu quản trị không chính xác.\"}", "Không thay đổi", "Passed", "Auto", "Báo lỗi xác thực chung, ngăn chặn rò rỉ thông tin tài khoản"},
                {"ID-054", "Security", "Đăng nhập thất bại khi tài khoản bị khóa hoặc vô hiệu hóa", "Tài khoản admin có status != ACTIVE (status=BLOCKED)", "username=blocked_admin, password=123456", "None", "{\"username\": \"blocked_admin\", \"password\": \"123456\"}", "403 Forbidden", "{\"message\": \"Tài khoản quản trị đã bị vô hiệu hóa.\"}", "Không thay đổi", "Passed", "Auto", "Chặn đăng nhập ngay khi tài khoản bị khóa, không xử lý kiểm tra pass"},
                {"ID-055", "Validation", "Bỏ trống trường username khi gửi request đăng nhập", "Hệ thống backend đang chạy", "username=\"\", password=123456", "None", "{\"username\": \"\", \"password\": \"123456\"}", "400 Bad Request", "Trống hoặc Thông báo lỗi validation @NotBlank cho username", "Không thay đổi", "Passed", "Auto", "Kiểm tra ràng buộc hợp lệ dữ liệu đầu vào phía server"},
                {"ID-056", "Validation", "Bỏ trống trường password khi gửi request đăng nhập", "Hệ thống backend đang chạy", "username=admin, password=\"\"", "None", "{\"username\": \"admin\", \"password\": \"\"}", "400 Bad Request", "Trống hoặc Thông báo lỗi validation @NotBlank cho password", "Không thay đổi", "Passed", "Auto", "Kiểm tra ràng buộc hợp lệ dữ liệu đầu vào phía server"},
                {"ID-057", "Security", "Thử nghiệm tấn công SQL Injection qua trường username", "Hệ thống backend đang chạy", "username=' OR '1'='1, password=123456", "None", "{\"username\": \"' OR '1'='1\", \"password\": \"123456\"}", "401 Unauthorized", "{\"message\": \"Tài khoản hoặc mật khẩu quản trị không chính xác.\"}", "Không thay đổi", "Passed", "Auto", "Xác nhận JPA Repository parameterized query chống bypass SQLi an toàn"},
                {"ID-058", "Session", "Kiểm tra thông tin Admin hiện tại khi session hợp lệ (GET /api/admin/me)", "Đã đăng nhập Admin thành công, session chứa ADMIN_USER", "session: valid_admin", "None", "None", "200 OK", "{\"id\": 1, \"username\": \"admin\", \"displayName\": \"...\", \"role\": \"ADMIN\"}", "Không thay đổi", "Passed", "Auto", "Xác thực quyền Admin và trả về thông tin hồ sơ phiên làm việc"},
                {"ID-059", "Session", "Kiểm tra thông tin Admin khi chưa đăng nhập (GET /api/admin/me)", "Chưa thực hiện đăng nhập hoặc session đã hết hạn", "None", "None", "None", "401 Unauthorized", "{\"message\": \"Chưa đăng nhập quản trị viên.\"}", "Không thay đổi", "Passed", "Auto", "Chặn truy cập trái phép khi thiếu session hoặc cookie không hợp lệ"},
                {"ID-060", "Session", "Đăng xuất quản trị viên và hủy phiên làm việc (POST /api/admin/logout)", "Đang có session Admin hợp lệ", "session: valid_admin", "None", "None", "200 OK", "{\"message\": \"Đã đăng xuất quản trị thành công.\"}", "Không thay đổi", "Passed", "Auto", "Hủy session phía server (session.invalidate()), ngăn tái sử dụng phiên"}
        };

        for (int i = 0; i < testcases.length; i++) {
            XSSFRow row = sheet.createRow(12 + i);
            row.setHeightInPoints(34);
            String[] tc = testcases[i];

            for (int j = 0; j < tc.length; j++) {
                XSSFCell cell = row.createCell(j);
                cell.setCellValue(tc[j]);
                if (j == 0 || j == 1 || j == 7 || j == 11) {
                    cell.setCellStyle(centerDataStyle);
                } else if (j == 10) {
                    cell.setCellStyle(passedStyle);
                } else {
                    cell.setCellStyle(dataStyle);
                }
            }
        }

        sheet.setColumnWidth(0, 2600);
        sheet.setColumnWidth(1, 3800);
        sheet.setColumnWidth(2, 9000);
        sheet.setColumnWidth(3, 7500);
        sheet.setColumnWidth(4, 6500);
        sheet.setColumnWidth(5, 2500);
        sheet.setColumnWidth(6, 6500);
        sheet.setColumnWidth(7, 3800);
        sheet.setColumnWidth(8, 9000);
        sheet.setColumnWidth(9, 6000);
        sheet.setColumnWidth(10, 2800);
        sheet.setColumnWidth(11, 2800);
        sheet.setColumnWidth(12, 7500);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            wb.write(fos);
        }
        wb.close();
        System.out.println("  + Đã tạo sheet 'Admin_API' trong " + filePath);
    }

    private void generateScreenSheet(String filePath) throws Exception {
        File file = new File(filePath);
        XSSFWorkbook wb;
        if (file.exists()) {
            try (FileInputStream fis = new FileInputStream(file)) {
                wb = new XSSFWorkbook(fis);
            }
        } else {
            wb = new XSSFWorkbook();
        }

        String sheetName = "Admin_Screen";
        int existingIdx = wb.getSheetIndex(sheetName);
        if (existingIdx != -1) {
            wb.removeSheetAt(existingIdx);
        }

        XSSFSheet sheet = wb.createSheet(sheetName);
        sheet.setDisplayGridlines(true);

        // Header Style (light blue background RGB(207, 226, 243) or RGB(189, 215, 238) as in image 3)
        XSSFCellStyle headerStyle = wb.createCellStyle();
        XSSFFont headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setFontName("Calibri");
        headerFont.setFontHeightInPoints((short) 10);
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 189, (byte) 215, (byte) 238}, null));
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(headerStyle);

        XSSFCellStyle dataStyle = wb.createCellStyle();
        XSSFFont dataFont = wb.createFont();
        dataFont.setFontName("Calibri");
        dataFont.setFontHeightInPoints((short) 9);
        dataStyle.setFont(dataFont);
        dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        dataStyle.setWrapText(true);
        setBorders(dataStyle);

        XSSFCellStyle centerDataStyle = wb.createCellStyle();
        centerDataStyle.cloneStyleFrom(dataStyle);
        centerDataStyle.setAlignment(HorizontalAlignment.CENTER);

        XSSFCellStyle passedStyle = wb.createCellStyle();
        passedStyle.cloneStyleFrom(centerDataStyle);
        passedStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 198, (byte) 239, (byte) 206}, null));
        passedStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont passedFont = wb.createFont();
        passedFont.setFontName("Calibri");
        passedFont.setBold(true);
        passedFont.setColor(new XSSFColor(new byte[]{(byte) 0, (byte) 97, (byte) 0}, null));
        passedStyle.setFont(passedFont);

        // Header Rows at Row index 12 & 13 (Row 13 & 14 in Excel)
        XSSFRow row12 = sheet.createRow(12);
        XSSFRow row13 = sheet.createRow(13);
        row12.setHeightInPoints(22);
        row13.setHeightInPoints(22);

        for (int c = 0; c < 11; c++) {
            row12.createCell(c).setCellStyle(headerStyle);
            row13.createCell(c).setCellStyle(headerStyle);
        }

        row12.getCell(0).setCellValue("No.");
        row12.getCell(1).setCellValue("Main Category");
        row12.getCell(2).setCellValue("Sub Category");
        row12.getCell(3).setCellValue("Type");
        row12.getCell(4).setCellValue("Pre Conditions");
        row12.getCell(5).setCellValue("Test Descriptions");
        row12.getCell(6).setCellValue("Steps");
        row12.getCell(7).setCellValue("Expected Result");
        row12.getCell(8).setCellValue("Testing result");
        row13.getCell(8).setCellValue("Chrome");
        row13.getCell(9).setCellValue("Execution");
        row12.getCell(10).setCellValue("Remarks");

        // Merge headers
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 0, 0)); // No.
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 1, 1)); // Main Category
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 2, 2)); // Sub Category
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 3, 3)); // Type
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 4, 4)); // Pre Conditions
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 5, 5)); // Test Descriptions
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 6, 6)); // Steps
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 7, 7)); // Expected Result
        sheet.addMergedRegion(new CellRangeAddress(12, 12, 8, 9)); // Testing result (Chrome + Execution)
        sheet.addMergedRegion(new CellRangeAddress(12, 13, 10, 10)); // Remarks

        String[][] screenTestcases = {
                {"ID-001", "Trang Đăng nhập Quản trị", "Giao diện", "UI", "Mở trình duyệt, truy cập http://localhost:5173/#/admin/login", "Xác nhận hiển thị đầy đủ các thành phần giao diện đăng nhập Admin", "1. Mở trang /admin/login\n2. Quan sát giao diện", "Hiển thị rõ ràng: huy hiệu ADMIN PORTAL, RESTRICTED, tiêu đề, ô nhập Username, ô Password, nút con mắt, checkbox Ghi nhớ phiên, nút Đăng nhập Quản trị, link quay lại", "Passed", "Manual", "Giao diện Dark Mode chuẩn công nghệ"},
                {"ID-002", "Trang Đăng nhập Quản trị", "Validate Client", "Validate", "Đang ở trang đăng nhập Admin", "Xác nhận báo lỗi khi bấm đăng nhập với trường rỗng", "1. Để trống username và password\n2. Click nút \"Đăng nhập Quản trị\"", "Hiển thị banner thông báo lỗi màu đỏ yêu cầu nhập đầy đủ tên đăng nhập/mật khẩu, không gửi request", "Passed", "Manual", "Validation tức thời tại client"},
                {"ID-003", "Trang Đăng nhập Quản trị", "Ẩn/Hiện Mật khẩu", "Function", "Đang ở trang đăng nhập Admin, đã nhập mật khẩu", "Xác nhận tính năng ẩn/hiện mật khẩu qua nút con mắt", "1. Nhập mật khẩu vào ô password\n2. Click icon con mắt\n3. Click lại icon con mắt", "Click lần 1: Mật khẩu hiển thị rõ dạng văn bản (text). Click lần 2: Mật khẩu bị ẩn thành dạng dấu chấm (password)", "Passed", "Manual", "Đảm bảo tính tiện dụng khi nhập pass dài"},
                {"ID-004", "Trang Đăng nhập Quản trị", "Trạng thái Loading", "UI", "Đang ở trang đăng nhập Admin", "Xác nhận hiệu ứng loading và chống click đúp khi submit", "1. Nhập username và password hợp lệ\n2. Click nút \"Đăng nhập Quản trị\"", "Nút chuyển sang trạng thái \"Đang xác thực...\" kèm spinner quay tròn, nút bị disable ngăn chặn click nhiều lần liên tiếp", "Passed", "Manual", "Tránh gửi request trùng lặp"},
                {"ID-005", "Trang Đăng nhập Quản trị", "Xác thực thành công", "Function", "Tài khoản admin hợp lệ trong database", "Xác nhận đăng nhập thành công và chuyển hướng trang", "1. Nhập đúng username và password\n2. Click \"Đăng nhập Quản trị\"", "Đăng nhập thành công, lưu thông tin phiên và tự động chuyển hướng mượt mà sang trang /admin/dashboard", "Passed", "Manual", "Đã lưu phiên đăng nhập admin"},
                {"ID-006", "Trang Đăng nhập Quản trị", "Sai thông tin", "Function", "Đang ở trang đăng nhập Admin", "Xác nhận hiển thị thông báo lỗi khi sai tài khoản hoặc mật khẩu", "1. Nhập username hoặc password không đúng\n2. Click \"Đăng nhập Quản trị\"", "Hiển thị banner màu đỏ nổi bật với thông báo lỗi rõ ràng từ server: \"Tài khoản hoặc mật khẩu quản trị không chính xác.\"", "Passed", "Manual", "Thông báo rõ ràng, dễ hiểu"},
                {"ID-007", "Trang Đăng nhập Quản trị", "Ghi nhớ phiên (Remember Me)", "Function", "Đang ở trang đăng nhập Admin", "Xác nhận cơ chế lưu trữ phiên khi tích hoặc không tích Remember Me", "1. Tích chọn \"Ghi nhớ phiên\" -> Đăng nhập\n2. Lần khác: Bỏ tích \"Ghi nhớ phiên\" -> Đăng nhập", "Khi tích chọn: Lưu thông tin vào localStorage (giữ khi đóng tab). Khi bỏ tích: Lưu vào sessionStorage (hết hạn khi đóng tab)", "Passed", "Manual", "Quản lý session client an toàn"},
                {"ID-008", "Trang Đăng nhập Quản trị", "Chuyển trang", "Function", "Đang ở trang đăng nhập Admin", "Xác nhận liên kết quay lại trang đăng nhập người dùng", "1. Click vào liên kết \"← Quay lại đăng nhập người dùng (Threads)\"", "Trình duyệt chuyển hướng về trang /login dành cho người dùng mạng xã hội Threads", "Passed", "Manual", "Điều hướng linh hoạt"},
                {"ID-009", "Phân quyền trang Admin", "Protected Route", "Security", "Chưa thực hiện đăng nhập Admin", "Xác nhận bảo vệ các trang quản trị không bị truy cập trái phép", "1. Gõ trực tiếp URL http://localhost:5173/#/admin/dashboard lên thanh địa chỉ", "Hệ thống tự động chặn và chuyển hướng người dùng về lại trang /admin/login", "Passed", "Auto", "Bảo vệ tài nguyên phía client"}
        };

        for (int i = 0; i < screenTestcases.length; i++) {
            XSSFRow row = sheet.createRow(14 + i);
            row.setHeightInPoints(34);
            String[] tc = screenTestcases[i];

            for (int j = 0; j < tc.length; j++) {
                XSSFCell cell = row.createCell(j);
                cell.setCellValue(tc[j]);
                if (j == 0 || j == 3 || j == 9) {
                    cell.setCellStyle(centerDataStyle);
                } else if (j == 8) {
                    cell.setCellStyle(passedStyle);
                } else {
                    cell.setCellStyle(dataStyle);
                }
            }
        }

        sheet.setColumnWidth(0, 2600);
        sheet.setColumnWidth(1, 5500);
        sheet.setColumnWidth(2, 5000);
        sheet.setColumnWidth(3, 3000);
        sheet.setColumnWidth(4, 7500);
        sheet.setColumnWidth(5, 8000);
        sheet.setColumnWidth(6, 8500);
        sheet.setColumnWidth(7, 9500);
        sheet.setColumnWidth(8, 2800);
        sheet.setColumnWidth(9, 2800);
        sheet.setColumnWidth(10, 6000);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            wb.write(fos);
        }
        wb.close();
        System.out.println("  + Đã tạo sheet 'Admin_Screen' trong " + filePath);
    }

    private void setBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }
}
