import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldAlert, 
  Heart, 
  HelpCircle, 
  Cpu, 
  BookOpen, 
  CheckCircle2, 
  Flame, 
  Smile, 
  Frown, 
  Meh 
} from 'lucide-react';
import './AiGuideModal.css';

const TABS = [
  { id: 'overview', label: 'Tổng quan PhoBERT', icon: Cpu },
  { id: 'tasks', label: '3 Tác vụ phân tích', icon: ShieldAlert },
  { id: 'metrics', label: 'Chỉ số & Công thức', icon: Heart },
  { id: 'faq', label: 'Mẹo & Hướng dẫn', icon: HelpCircle },
];

export default function AiGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  return (
    <div className="agm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="agm-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="agm-header">
          <div className="agm-title-group">
            <div className="agm-icon-wrap">
              <Sparkles size={20} className="agm-icon-sparkle" />
            </div>
            <div>
              <h2 className="agm-title">Hướng Dẫn & Giải Thích Mô Hình AI</h2>
              <p className="agm-subtitle">Tài liệu kỹ thuật PhoBERT Tiếng Việt và các tiêu chuẩn phân loại</p>
            </div>
          </div>
          <button className="agm-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="agm-tab-bar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`agm-tab-btn ${isActive ? 'agm-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="agm-body">
          {/* TAB 1: Tổng quan PhoBERT */}
          {activeTab === 'overview' && (
            <div className="agm-section">
              <div className="agm-hero-box">
                <h4 className="agm-hero-title">🧠 Mô hình nền tảng: PhoBERT-base (v2.4)</h4>
                <p className="agm-hero-desc">
                  Hệ thống Social Comment Analyzer ứng dụng mô hình PhoBERT được huấn luyện chuyên biệt trên tập dữ liệu tiếng Việt quy mô lớn (hơn 20GB văn bản mạng xã hội). Mô hình đạt độ chính xác trung bình trên <strong>96.8%</strong> trong việc nhận diện sắc thái ngữ cảnh và tiếng lóng.
                </p>
              </div>

              <h4 className="agm-h4">Pipeline 10 bước tiền xử lý văn bản:</h4>
              <div className="agm-pipeline-grid">
                <div className="agm-pipe-item">
                  <span className="agm-pipe-num">1</span>
                  <div className="agm-pipe-text">
                    <strong>Chuyển chữ thường</strong>
                    <span>Đồng nhất định dạng văn bản (lowercase).</span>
                  </div>
                </div>
                <div className="agm-pipe-item">
                  <span className="agm-pipe-num">2</span>
                  <div className="agm-pipe-text">
                    <strong>Loại bỏ URL & Link</strong>
                    <span>Xóa toàn bộ các liên kết http/https/www rác.</span>
                  </div>
                </div>
                <div className="agm-pipe-item">
                  <span className="agm-pipe-num">3</span>
                  <div className="agm-pipe-text">
                    <strong>Xóa @mention & #tag</strong>
                    <span>Tránh làm sai lệch trọng số ngữ nghĩa câu.</span>
                  </div>
                </div>
                <div className="agm-pipe-item">
                  <span className="agm-pipe-num">4</span>
                  <div className="agm-pipe-text">
                    <strong>Chuẩn hóa Teencode</strong>
                    <span>Chuyển từ viết tắt: "ko" → "không", "dc" → "được".</span>
                  </div>
                </div>
                <div className="agm-pipe-item">
                  <span className="agm-pipe-num">5</span>
                  <div className="agm-pipe-text">
                    <strong>Rút gọn ký tự lặp</strong>
                    <span>Kéo dài nguyên âm: "ngonnnn" → "ngon", "quáaa" → "quá".</span>
                  </div>
                </div>
                <div className="agm-pipe-item">
                  <span className="agm-pipe-num">6</span>
                  <div className="agm-pipe-text">
                    <strong>Tách từ Pyvi Tokenize</strong>
                    <span>Phân đoạn từ chuẩn PhoBERT (sản_phẩm, nhiệt_tình).</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3 Tác vụ phân tích */}
          {activeTab === 'tasks' && (
            <div className="agm-section">
              {/* Task 1 */}
              <div className="agm-task-card">
                <div className="agm-task-head">
                  <ShieldAlert size={18} className="text-red" />
                  <h4 className="agm-task-title">1. Phân loại Độc hại (Toxicity Detection)</h4>
                </div>
                <p className="agm-task-desc">
                  Phân tích nhị phân nhằm xác định xem một bình luận có mang tính tiêu cực cực đoan, xúc phạm cá nhân hay không.
                </p>
                <div className="agm-badges-row">
                  <span className="agm-badge agm-badge-green">NON-TOXIC (0) - Bình luận lành mạnh</span>
                  <span className="agm-badge agm-badge-red">TOXIC (1) - Chứa từ ngữ độc hại</span>
                </div>
              </div>

              {/* Task 2 */}
              <div className="agm-task-card">
                <div className="agm-task-head">
                  <Flame size={18} className="text-amber" />
                  <h4 className="agm-task-title">2. Phân loại Ngôn từ thù ghét (Hate Speech)</h4>
                </div>
                <p className="agm-task-desc">
                  Phân loại 3 mức độ công kích, kỳ thị chủng tộc, tôn giáo, vùng miền hoặc nội dung xúc phạm thù địch.
                </p>
                <div className="agm-badges-row">
                  <span className="agm-badge agm-badge-green">CLEAN (0) - Nội dung sạch</span>
                  <span className="agm-badge agm-badge-amber">OFFENSIVE (1) - Khiêu khích, thô lỗ</span>
                  <span className="agm-badge agm-badge-purple">HATE (2) - Ngôn từ thù ghét nghiêm trọng</span>
                </div>
              </div>

              {/* Task 3 */}
              <div className="agm-task-card">
                <div className="agm-task-head">
                  <Heart size={18} className="text-cyan" />
                  <h4 className="agm-task-title">3. Phân tích Cảm xúc (Sentiment Analysis)</h4>
                </div>
                <p className="agm-task-desc">
                  Đánh giá sắc thái tình cảm của người dùng khi phản hồi bài viết để nắm bắt tâm lý cộng đồng.
                </p>
                <div className="agm-badges-row">
                  <span className="agm-badge agm-badge-green"><Smile size={12} /> POSITIVE - Tích cực</span>
                  <span className="agm-badge agm-badge-gray"><Meh size={12} /> NEUTRAL - Trung lập</span>
                  <span className="agm-badge agm-badge-red"><Frown size={12} /> NEGATIVE - Tiêu cực</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Chỉ số & Công thức */}
          {activeTab === 'metrics' && (
            <div className="agm-section">
              <div className="agm-formula-box">
                <h4 className="agm-formula-title">📐 Điểm Cảm Xúc Ròng (Net Sentiment Score)</h4>
                <div className="agm-formula-code">
                  Net Score = ((Số bình luận POSITIVE - Số bình luận NEGATIVE) / Tổng bình luận) × 100
                </div>
                <p className="agm-formula-desc">
                  Thang điểm dao động từ <strong>-100</strong> (hoàn toàn tiêu cực) đến <strong>+100</strong> (hoàn toàn tích cực).
                  Mức trên <strong>+20</strong> phản ánh phản hồi rất tích cực từ người theo dõi Threads.
                </p>
              </div>

              <div className="agm-formula-box">
                <h4 className="agm-formula-title">🛡️ Tỷ Lệ Lành Mạnh Cộng Đồng (Safe Community Rate)</h4>
                <div className="agm-formula-code">
                  Safe Rate = (Số bình luận NON-TOXIC / Tổng số bình luận được quét) × 100%
                </div>
                <p className="agm-formula-desc">
                  Nếu tỷ lệ an toàn đạt trên <strong>95%</strong>, hệ thống tự động gắn nhãn "Lành mạnh". Nếu dưới <strong>90%</strong>, hệ thống sẽ kích hoạt cảnh báo người kiểm duyệt cần rà soát bài viết.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Mẹo & Hướng dẫn */}
          {activeTab === 'faq' && (
            <div className="agm-section">
              <div className="agm-faq-item">
                <h4 className="agm-faq-q">❓ Làm thế nào để phân tích một bài viết mới?</h4>
                <p className="agm-faq-a">
                  Chọn bài viết bạn muốn kiểm tra từ danh sách bên trái, sau đó nhấn nút <strong>"↻ Quét & Phân tích bài viết"</strong>. Hệ thống sẽ tự động đồng bộ bình luận từ Threads API, chạy qua mô hình PhoBERT và lưu kết quả vào cơ sở dữ liệu.
                </p>
              </div>

              <div className="agm-faq-item">
                <h4 className="agm-faq-q">❓ Làm sao để lưu lại kết quả phân tích để báo cáo?</h4>
                <p className="agm-faq-a">
                  Bạn có thể nhấn vào nút <strong>"📥 Xuất báo cáo"</strong> trên đầu danh sách bài viết. Modal xuất báo cáo cung cấp 3 lựa chọn: sao chép nhanh văn bản tóm tắt, tải file Text định dạng UTF-8 hoặc tải file dữ liệu JSON chuẩn.
                </p>
              </div>

              <div className="agm-faq-item">
                <h4 className="agm-faq-q">❓ Giới hạn quota phân tích hàng ngày hoạt động thế nào?</h4>
                <p className="agm-faq-a">
                  Tài khoản thông thường được cung cấp 5 lượt quét phân tích miễn phí mỗi ngày. Khi nâng cấp gói VIP, bạn sẽ được phân tích không giới hạn số lượng bài viết và số lượng bình luận.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="agm-footer">
          <span className="agm-footer-note">Hệ thống Social Comment Analyzer • Phòng nghiên cứu AI</span>
          <button type="button" className="agm-btn-close" onClick={onClose}>
            Đã hiểu & Đóng
          </button>
        </div>

      </div>
    </div>
  );
}

