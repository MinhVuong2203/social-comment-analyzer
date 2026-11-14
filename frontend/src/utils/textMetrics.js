/**
 * Tiện ích tính toán chỉ số văn bản và thống kê số liệu bình luận tiếng Việt.
 */

/**
 * Tính toán điểm cảm xúc ròng (Net Sentiment Score).
 * Công thức: ((Positive - Negative) / Total) * 100
 * @param {number} positive - Số lượng bình luận tích cực
 * @param {number} negative - Số lượng bình luận tiêu cực
 * @param {number} total - Tổng số bình luận
 * @returns {number} Điểm số từ -100 đến +100
 */
export function calculateNetSentimentScore(positive, negative, total) {
  if (!total || total <= 0) return 0;
  const pos = Math.max(0, Number(positive) || 0);
  const neg = Math.max(0, Number(negative) || 0);
  const score = ((pos - neg) / total) * 100;
  return Math.round(score);
}

/**
 * Tính tỷ lệ an toàn của cộng đồng (Safe Community Ratio).
 * Công thức: (Non-toxic / Total) * 100
 * @param {number} nonToxic - Số lượng bình luận không độc hại
 * @param {number} total - Tổng số bình luận
 * @returns {number} Tỷ lệ phần trăm từ 0 đến 100 (làm tròn 1 chữ số thập phân)
 */
export function calculateSafeRatio(nonToxic, total) {
  if (!total || total <= 0) return 100;
  const safe = Math.max(0, Number(nonToxic) || 0);
  const pct = (safe / total) * 100;
  return parseFloat(pct.toFixed(1));
}

/**
 * Đánh giá mức độ cảnh báo của bài viết dựa trên chỉ số độc hại và phản cảm.
 * @param {object} param0 
 * @returns {{ level: 'SAFE' | 'WARNING' | 'DANGER', label: string, color: string }}
 */
export function evaluateSafetyStatus({ toxicCount = 0, hateCount = 0, totalComments = 0 }) {
  if (!totalComments || totalComments <= 0) {
    return { level: 'SAFE', label: 'Lành mạnh', color: '#10b981' };
  }

  const toxicRatio = (toxicCount / totalComments) * 100;
  const hateRatio = (hateCount / totalComments) * 100;

  if (hateRatio > 10 || toxicRatio > 25) {
    return { level: 'DANGER', label: 'Báo động đỏ', color: '#ef4444' };
  }

  if (hateRatio > 3 || toxicRatio > 10) {
    return { level: 'WARNING', label: 'Cần chú ý', color: '#f59e0b' };
  }

  return { level: 'SAFE', label: 'Lành mạnh', color: '#10b981' };
}

/**
 * Định dạng số lượng lớn thành ký tự rút gọn (1.2K, 3.5M).
 * @param {number} num 
 * @returns {string}
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const val = Number(num);
  if (val >= 1000000) {
    return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return val.toString();
}

/**
 * Cắt ngắn chuỗi văn bản an toàn kèm dấu ba chấm.
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncateText(text, maxLength = 80) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

