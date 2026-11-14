/**
 * Kiểm thử đơn vị cho reportExporter.js
 */

import { buildReportData, formatReportText } from './reportExporter.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runReportExporterTests() {
  console.log(">>> Bắt đầu chạy test reportExporter.js...");

  const mockPost = {
    id: "post_123456",
    text: "Hôm nay thời tiết đẹp quá!",
    timestamp: "2026-11-14T08:00:00Z",
    permalink: "https://threads.net/@user/post/123",
    totalReplies: 15,
    analyzed: true
  };

  const mockAnalysis = {
    totalComments: 15,
    sentiment: { POSITIVE: 10, NEUTRAL: 4, NEGATIVE: 1 },
    toxicity: { 'NON-TOXIC': 14, 'TOXIC': 1 },
    hateSpeech: { CLEAN: 14, OFFENSIVE: 1, HATE: 0 }
  };

  const mockUser = {
    username: "hoangminz",
    name: "Hoàng Minh"
  };

  // 1. Kiểm tra buildReportData với đầy đủ dữ liệu
  const report = buildReportData({
    post: mockPost,
    analysis: mockAnalysis,
    overview: null,
    user: mockUser
  });

  assert(report.account.username === "hoangminz", "Map đúng username");
  assert(report.post.id === "post_123456", "Map đúng post ID");
  assert(report.metrics.totalAnalyzedReplies === 15, "Tổng số comment là 15");
  assert(report.metrics.toxicityBreakdown.toxic === 1, "Số toxic = 1");
  assert(report.metrics.sentimentBreakdown.positive === 10, "Số positive = 10");
  assert(report.metrics.sentimentBreakdown.netSentimentScore === 60, "Net score = (10 - 1)/15 * 100 = 60");

  // 2. Kiểm tra formatReportText sinh chuỗi văn bản UTF-8
  const textOutput = formatReportText(report);
  assert(typeof textOutput === 'string' && textOutput.length > 100, "Sinh chuỗi văn bản hợp lệ");
  assert(textOutput.includes("BÁO CÁO PHÂN TÍCH BÌNH LUẬN THREADS"), "Có tiêu đề báo cáo");
  assert(textOutput.includes("@hoangminz"), "Có thông tin tài khoản");
  assert(textOutput.includes("ĐỘ ĐỘC HẠI"), "Có mục Toxicity");
  assert(textOutput.includes("CẢM XÚC"), "Có mục Sentiment");
  assert(textOutput.includes("+60"), "Có điểm Net score");

  // 3. Kiểm tra trường hợp biên (post rỗng / không có phân tích)
  const emptyReport = buildReportData({ post: null, analysis: null, overview: null, user: null });
  assert(emptyReport.post === null, "Post null an toàn");
  assert(emptyReport.metrics.totalAnalyzedReplies === 0, "Tổng comment = 0");
  assert(emptyReport.account.username === "threads_user", "Fallback username");

  const emptyText = formatReportText(emptyReport);
  assert(emptyText.includes("Thống kê tổng hợp toàn bộ bài viết"), "Phạm vi tổng hợp");

  console.log(">>> [SUCCESS] Toàn bộ 11 kịch bản kiểm thử reportExporter.js ĐÃ ĐẠT (PASSED)!");
  return true;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('reportExporter.test.js')) {
  runReportExporterTests();
}

