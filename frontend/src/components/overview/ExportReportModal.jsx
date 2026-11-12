import React, { useState } from 'react';
import { X, Download, FileText, Copy, Check, Sparkles, Shield, HeartHandshake } from 'lucide-react';
import { 
  buildReportData, 
  formatReportText, 
  downloadJsonReport, 
  downloadTextReport, 
  copyToClipboard 
} from '../../utils/reportExporter';
import './ExportReportModal.css';

export default function ExportReportModal({ 
  isOpen, 
  onClose, 
  post, 
  analysis, 
  overview, 
  user,
  onNotify 
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const reportData = buildReportData({ post, analysis, overview, user });
  const previewText = formatReportText(reportData);
  const postId = post?.id ? post.id.substring(0, 10) : 'overview';

  const handleCopy = async () => {
    try {
      await copyToClipboard(previewText);
      setCopied(true);
      onNotify?.("Đã sao chép nội dung báo cáo vào bộ nhớ tạm!", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify?.("Không thể sao chép vào bộ nhớ tạm", "error");
    }
  };

  const handleDownloadText = () => {
    downloadTextReport(reportData, postId);
    onNotify?.("Đã tải xuống file báo cáo text (.txt)!", "success");
  };

  const handleDownloadJson = () => {
    downloadJsonReport(reportData, postId);
    onNotify?.("Đã tải xuống file dữ liệu JSON (.json)!", "success");
  };

  return (
    <div className="erm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="erm-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="erm-header">
          <div className="erm-title-group">
            <div className="erm-icon-wrap">
              <Sparkles size={18} className="erm-icon-sparkle" />
            </div>
            <div>
              <h3 className="erm-title">Xuất Báo Cáo Phân Tích AI</h3>
              <p className="erm-subtitle">Tóm tắt số liệu & trích xuất kết quả PhoBERT</p>
            </div>
          </div>
          <button className="erm-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Quick Highlights Row */}
        <div className="erm-highlights">
          <div className="erm-highlight-card">
            <span className="erm-hl-label">TỔNG BÌNH LUẬN</span>
            <span className="erm-hl-value">{reportData.metrics.totalAnalyzedReplies}</span>
          </div>
          <div className="erm-highlight-card">
            <span className="erm-hl-label">TỶ LỆ LÀNH MẠNH</span>
            <span className="erm-hl-value text-green">
              {reportData.metrics.totalAnalyzedReplies > 0
                ? `${((reportData.metrics.toxicityBreakdown.nonToxic / reportData.metrics.totalAnalyzedReplies) * 100).toFixed(1)}%`
                : '100%'}
            </span>
          </div>
          <div className="erm-highlight-card">
            <span className="erm-hl-label">ĐỘ TIN CẬY AI</span>
            <span className="erm-hl-value text-cyan">96.8%</span>
          </div>
        </div>

        {/* Text Preview Area */}
        <div className="erm-preview-wrap">
          <div className="erm-preview-head">
            <span>BẢN XEM TRƯỚC BÁO CÁO</span>
            <span className="erm-preview-tag">UTF-8 Formatted</span>
          </div>
          <pre className="erm-preview-content">{previewText}</pre>
        </div>

        {/* Actions Bar */}
        <div className="erm-footer">
          <button 
            type="button" 
            className="erm-btn erm-btn-secondary" 
            onClick={handleCopy}
            title="Sao chép toàn bộ văn bản báo cáo"
          >
            {copied ? <Check size={15} className="text-green" /> : <Copy size={15} />}
            <span>{copied ? "Đã sao chép!" : "Sao chép tóm tắt"}</span>
          </button>

          <button 
            type="button" 
            className="erm-btn erm-btn-secondary" 
            onClick={handleDownloadText}
            title="Tải về file text định dạng UTF-8"
          >
            <FileText size={15} />
            <span>Tải file .TXT</span>
          </button>

          <button 
            type="button" 
            className="erm-btn erm-btn-primary" 
            onClick={handleDownloadJson}
            title="Tải về dữ liệu cấu trúc JSON chuẩn"
          >
            <Download size={15} />
            <span>Tải dữ liệu JSON</span>
          </button>
        </div>

      </div>
    </div>
  );
}
