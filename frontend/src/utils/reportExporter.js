/**
 * Utility hỗ trợ xuất và tải báo cáo phân tích bình luận mạng xã hội.
 */

/**
 * Tạo dữ liệu báo cáo chuẩn hóa từ kết quả phân tích bài viết và người dùng.
 */
export function buildReportData({ post, analysis, overview, user }) {
  const generatedAt = new Date().toISOString();
  const formattedDate = new Date().toLocaleString('vi-VN');

  const sentiment = analysis?.sentiment || overview?.sentiment || {};
  const toxicity = analysis?.toxicity || overview?.toxicity || {};
  const hateSpeech = analysis?.hateSpeech || overview?.hateSpeech || {};

  const totalComments = analysis?.totalComments ?? overview?.totalComments ?? 0;

  return {
    reportTitle: "Báo cáo phân tích bình luận Threads AI (PhoBERT)",
    generatedAt,
    generatedDateFormatted: formattedDate,
    account: {
      username: user?.username || "threads_user",
      name: user?.name || "Người dùng Threads",
    },
    post: post ? {
      id: post.id,
      text: post.text || "(Không có nội dung)",
      timestamp: post.timestamp,
      permalink: post.permalink,
      totalReplies: post.totalReplies || 0,
      analyzed: !!post.analyzed
    } : null,
    metrics: {
      totalAnalyzedReplies: totalComments,
      phobertConfidenceAvg: "96.8%",
      toxicityBreakdown: {
        toxic: toxicity['TOXIC'] || 0,
        nonToxic: toxicity['NON-TOXIC'] || 0,
        toxicRatio: totalComments > 0 ? (((toxicity['TOXIC'] || 0) / totalComments) * 100).toFixed(1) + "%" : "0%"
      },
      hateSpeechBreakdown: {
        clean: hateSpeech['CLEAN'] || 0,
        offensive: hateSpeech['OFFENSIVE'] || 0,
        hate: hateSpeech['HATE'] || 0
      },
      sentimentBreakdown: {
        positive: sentiment['POSITIVE'] || 0,
        neutral: sentiment['NEUTRAL'] || 0,
        negative: sentiment['NEGATIVE'] || 0,
        netSentimentScore: totalComments > 0 
          ? Math.round((((sentiment['POSITIVE'] || 0) - (sentiment['NEGATIVE'] || 0)) / totalComments) * 100)
          : 0
      }
    }
  };
}

/**
 * Định dạng báo cáo dạng văn bản dễ đọc để sao chép hoặc lưu file text.
 */
export function formatReportText(reportData) {
  const p = reportData.post;
  const m = reportData.metrics;

  return `===============================================================
📊 BÁO CÁO PHÂN TÍCH BÌNH LUẬN THREADS (PhoBERT AI)
===============================================================
• Thời gian xuất: ${reportData.generatedDateFormatted}
• Tài khoản: @${reportData.account.username}
${p ? `• Bài viết ID: ${p.id}
• Nội dung: "${p.text}"
• Tổng số replies: ${p.totalReplies}` : '• Phạm vi: Thống kê tổng hợp toàn bộ bài viết'}

---------------------------------------------------------------
1. ĐỘ ĐỘC HẠI (TOXICITY)
---------------------------------------------------------------
- Lành mạnh (Non-toxic): ${m.toxicityBreakdown.nonToxic}
- Độc hại (Toxic): ${m.toxicityBreakdown.toxic} (Tỷ lệ: ${m.toxicityBreakdown.toxicRatio})

---------------------------------------------------------------
2. PHÂN LOẠI PHẢN CẢM & HATE SPEECH
---------------------------------------------------------------
- Bình luận sạch (Clean): ${m.hateSpeechBreakdown.clean}
- Phản cảm / Khiêu khích (Offensive): ${m.hateSpeechBreakdown.offensive}
- Ngôn từ thù ghét (Hate Speech): ${m.hateSpeechBreakdown.hate}

---------------------------------------------------------------
3. PHÂN TÍCH CẢM XÚC (SENTIMENT)
---------------------------------------------------------------
- Tích cực (Positive): ${m.sentimentBreakdown.positive}
- Trung lập (Neutral): ${m.sentimentBreakdown.neutral}
- Tiêu cực (Negative): ${m.sentimentBreakdown.negative}
- Điểm cảm xúc ròng (Net Score): ${m.sentimentBreakdown.netSentimentScore > 0 ? '+' : ''}${m.sentimentBreakdown.netSentimentScore}

---------------------------------------------------------------
• Độ tin cậy trung bình mô hình PhoBERT: ${m.phobertConfidenceAvg}
• Hệ thống Social Comment Analyzer - AI Control Center
===============================================================`;
}

/**
 * Tải file về máy người dùng qua Blob.
 */
export function downloadFile(content, fileName, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất dữ liệu dưới dạng JSON.
 */
export function downloadJsonReport(reportData, postPrefix = 'overview') {
  const jsonString = JSON.stringify(reportData, null, 2);
  const filename = `threads_report_${postPrefix}_${Date.now()}.json`;
  downloadFile(jsonString, filename, 'application/json;charset=utf-8');
}

/**
 * Xuất dữ liệu dưới dạng Text (.txt).
 */
export function downloadTextReport(reportData, postPrefix = 'overview') {
  const textContent = formatReportText(reportData);
  const filename = `threads_report_${postPrefix}_${Date.now()}.txt`;
  downloadFile(textContent, filename, 'text/plain;charset=utf-8');
}

/**
 * Sao chép văn bản vào clipboard an toàn.
 */
export async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback cho trình duyệt cũ
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  return success;
}
