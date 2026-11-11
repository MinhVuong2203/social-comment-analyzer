import { useState } from 'react';
import './ThreadInfoCard.css';

const PAGE_SIZE = 3;

export default function ThreadInfoCard({ 
  posts = [], 
  selectedPostId, 
  onSelectPost, 
  onScan, 
  scanning = false,
  username = "threads_user"
}) {
  const [page, setPage] = useState(1);

  const displayPosts = posts || [];
  const totalPages = Math.max(1, Math.ceil(displayPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = displayPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatTime = (ts) => {
    if (!ts) return "Mới đây";
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      const diffMs = Date.now() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 1) return "Vừa xong";
      if (diffHrs < 24) return `${diffHrs} giờ trước`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays} ngày trước`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="tic-wrap">
      <div className="tic-list-header">
        <span className="tic-list-title">📋 Danh sách bài viết</span>
        <span className="tic-list-count">{displayPosts.length} bài</span>
      </div>

      <div className="tic-list">
        {displayPosts.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có bài viết nào được tải.
          </div>
        ) : (
          paginated.map((post) => {
            const isSelected = selectedPostId ? (post.id === selectedPostId) : false;
            return (
              <div
                key={post.id}
                className={`tic-post-item ${isSelected ? 'tic-post-selected' : ''}`}
                onClick={() => onSelectPost?.(post.id)}
              >
                <div className="tic-post-head">
                  <div className="tic-user">
                    <div className="tic-avatar">
                      {(username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="tic-user-meta">
                      <span className="tic-username">@{username || 'threads_user'}</span>
                      <span className="tic-sep">•</span>
                      <span className="tic-time">{formatTime(post.timestamp)}</span>
                    </div>
                  </div>
                  <div className="tic-post-badges">
                    {post.analyzed ? (
                      <span className="tic-active-badge">
                        <span className="tic-pulse" />
                        Đã phân tích
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        Chưa phân tích
                      </span>
                    )}
                    {isSelected && (
                      <span className="tic-selected-badge">✓ Đang chọn</span>
                    )}
                  </div>
                </div>

                <p className="tic-content">
                  {post.text ? `"${post.text}"` : "(Bài viết không có nội dung văn bản)"}
                </p>

                <div className="tic-stats">
                  {post.permalink && (
                    <a 
                      href={post.permalink} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                    >
                      🔗 Threads
                    </a>
                  )}
                  <span className="tic-replies-found">
                    <span className="tic-found-dot" />
                    {post.totalReplies ?? 0} replies
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="tic-pagination">
          <button
            className="tic-page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`tic-page-btn ${currentPage === p ? 'tic-page-active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="tic-page-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </button>

          <span className="tic-page-info">{currentPage} / {totalPages}</span>
        </div>
      )}

      <button 
        className="tic-scan-btn" 
        onClick={onScan} 
        disabled={scanning}
        style={{ opacity: scanning ? 0.7 : 1, cursor: scanning ? 'not-allowed' : 'pointer' }}
      >
        {scanning ? '⏳ Đang phân tích...' : '↻ Quét & Phân tích bài viết'}
      </button>
    </div>
  );
}
