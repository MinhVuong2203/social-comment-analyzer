/**
 * Kiểm thử đơn vị cho bộ tính toán chỉ số textMetrics.js
 */

import {
  calculateNetSentimentScore,
  calculateSafeRatio,
  evaluateSafetyStatus,
  formatCompactNumber,
  truncateText
} from './textMetrics.js';

// Hàm assertion helper đơn giản không phụ thuộc jest/vitest bên ngoài
function assert(condition, message) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runTextMetricsTests() {
  console.log(">>> Bắt đầu chạy test textMetrics.js...");

  // 1. calculateNetSentimentScore
  assert(calculateNetSentimentScore(50, 10, 100) === 40, "50 pos, 10 neg / 100 -> +40");
  assert(calculateNetSentimentScore(10, 50, 100) === -40, "10 pos, 50 neg / 100 -> -40");
  assert(calculateNetSentimentScore(30, 30, 100) === 0, "Cân bằng -> 0");
  assert(calculateNetSentimentScore(0, 0, 0) === 0, "0 comments -> 0");
  assert(calculateNetSentimentScore(null, undefined, 0) === 0, "Null/undefined safe");

  // 2. calculateSafeRatio
  assert(calculateSafeRatio(95, 100) === 95.0, "95/100 -> 95.0%");
  assert(calculateSafeRatio(0, 100) === 0.0, "0/100 -> 0.0%");
  assert(calculateSafeRatio(100, 100) === 100.0, "100/100 -> 100.0%");
  assert(calculateSafeRatio(0, 0) === 100.0, "0 comments -> mặc định 100%");

  // 3. evaluateSafetyStatus
  const safe = evaluateSafetyStatus({ toxicCount: 2, hateCount: 0, totalComments: 100 });
  assert(safe.level === 'SAFE', "Dưới 10% toxic -> SAFE");

  const warning = evaluateSafetyStatus({ toxicCount: 15, hateCount: 2, totalComments: 100 });
  assert(warning.level === 'WARNING', "15% toxic -> WARNING");

  const danger = evaluateSafetyStatus({ toxicCount: 30, hateCount: 12, totalComments: 100 });
  assert(danger.level === 'DANGER', "30% toxic và 12% hate -> DANGER");

  // 4. formatCompactNumber
  assert(formatCompactNumber(500) === "500", "500 -> 500");
  assert(formatCompactNumber(1200) === "1.2K", "1200 -> 1.2K");
  assert(formatCompactNumber(10000) === "10K", "10000 -> 10K");
  assert(formatCompactNumber(2500000) === "2.5M", "2.5M");
  assert(formatCompactNumber(null) === "0", "null -> 0");

  // 5. truncateText
  assert(truncateText("Ngắn", 10) === "Ngắn", "Text ngắn không bị cắt");
  assert(truncateText("Đây là một chuỗi văn bản rất dài cần cắt bớt", 15).endsWith("..."), "Có dấu ba chấm");
  assert(truncateText("", 10) === "", "Chuỗi rỗng");

  console.log(">>> [SUCCESS] Toàn bộ 16 kịch bản kiểm thử textMetrics.js ĐÃ ĐẠT (PASSED)!");
  return true;
}

// Tự động chạy khi được gọi trực tiếp bằng Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('textMetrics.test.js')) {
  runTextMetricsTests();
}
