import { useState } from 'react';
import './ThreadInfoCard.css';
const MOCK_POSTS = [
  {
    id: 1,
    username: '@nguyenminh',
    time: '2 giờ trước',
    content: '"Bạn nghĩ sao về công nghệ AI hiện nay? Anh em có thấy nó đang thay đổi tốc độ làm việc thực tế không?"',
    likes: '1.2K', shares: 328, replies: 184,
    repliesFound: 184, active: true,
  },
  {
    id: 2,
    username: '@techvietnam',
    time: '5 giờ trước',
    content: '"ChatGPT hay Gemini? Mọi người đang dùng tool AI nào để làm việc hiệu quả nhất?"',
    likes: '876', shares: 214, replies: 97,
    repliesFound: 97, active: false,
  },
  {
    id: 3,
    username: '@dev.hanoi',
    time: '8 giờ trước',
    content: '"Lập trình viên có bị AI thay thế trong 5 năm tới không? Mình thấy nhiều bạn lo lắng vấn đề này lắm."',
    likes: '2.1K', shares: 512, replies: 263,
    repliesFound: 263, active: false,
  },
  {
    id: 4,
    username: '@startup.vn',
    time: '1 ngày trước',
    content: '"Startup Việt Nam đang ứng dụng AI như thế nào? Chia sẻ case study thực tế của công ty bạn nhé!"',
    likes: '445', shares: 89, replies: 52,
    repliesFound: 52, active: false,
  },
  {
    id: 5,
    username: '@aifuture.vn',
    time: '1 ngày trước',
    content: '"Bạn có sẵn sàng trả tiền cho AI assistant không? Nếu có thì mức giá bao nhiêu là hợp lý?"',
    likes: '993', shares: 177, replies: 138,
    repliesFound: 138, active: false,
  },
  {
    id: 6,
    username: '@ml.vietnam',
    time: '2 ngày trước',
    content: '"Fine-tuning LLM với dữ liệu tiếng Việt — kinh nghiệm của mình sau 6 tháng thử nghiệm."',
    likes: '1.5K', shares: 401, replies: 89,
    repliesFound: 89, active: false,
  },
];

const PAGE_SIZE = 3;

export default function ThreadInfoCard({ onScan }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(1);

  const totalPages = Math.ceil(MOCK_POSTS.length / PAGE_SIZE);
  const paginated  = MOCK_POSTS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="tic-wrap">

      {/* ── List header ── */}
      <div className="tic-list-header">
        <span className="tic-list-title">📋 Danh sách bài viết</span>
        <span className="tic-list-count">{MOCK_POSTS.length} bài</span>
      </div>

      {/* ── Post list ── */}
      <div className="tic-list">
        {paginated.map(post => (
          <div
            key={post.id}
            className={`tic-post-item ${selected === post.id ? 'tic-post-selected' : ''}`}
            onClick={() => setSelected(post.id)}
          >
            <div className="tic-post-head">
              <div className="tic-user">
                <div className="tic-avatar" />
                <div className="tic-user-meta">
                  <span className="tic-username">{post.username}</span>
                  <span className="tic-sep">•</span>
                  <span className="tic-time">{post.time}</span>
                </div>
              </div>
              <div className="tic-post-badges">
                {post.active && (
                  <span className="tic-active-badge">
                    <span className="tic-pulse" />
                    Active
                  </span>
                )}
                {selected === post.id && (
                  <span className="tic-selected-badge">✓ Đang chọn</span>
                )}
              </div>
            </div>

            <p className="tic-content">{post.content}</p>

            <div className="tic-stats">
              <span>♥ {post.likes}</span>
              <span>↺ {post.shares}</span>
              <span>💬 {post.replies}</span>
              <span className="tic-replies-found">
                <span className="tic-found-dot" />
                {post.repliesFound} replies
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      <div className="tic-pagination">
        <button
          className="tic-page-btn"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ‹
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            className={`tic-page-btn ${page === p ? 'tic-page-active' : ''}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}

        <button
          className="tic-page-btn"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          ›
        </button>

        <span className="tic-page-info">{page} / {totalPages}</span>
      </div>

      {/* ── Scan button ── */}
      <button className="tic-scan-btn" onClick={onScan}>
        ↻ Quét lại replies thời gian thực
      </button>

    </div>
  );
}