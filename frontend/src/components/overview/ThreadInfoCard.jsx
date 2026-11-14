import { useState } from 'react';
import './ThreadInfoCard.css';

const PAGE_SIZE = 3;

function PostAvatar({ src, name, username, size = 28 }) {
  const [hasError, setHasError] = useState(false);
  const initial = (name || username || 'U').replace('@', '').trim().charAt(0).toUpperCase();

  if (src && !hasError) {
    return (
      <div
        className="tic-avatar-wrap"
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={username || 'avatar'}
          className="tic-avatar-img"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="tic-avatar-fallback"
      style={{ width: size, height: size, fontSize: size <= 22 ? 10 : 12 }}
      title={username}
    >
      {initial}
    </div>
  );
}

export default function ThreadInfoCard({
  posts = [],
  selectedPostId,
  onSelectPost,
  onScan,
  scanning = false,
  username = "threads_user",
  avatar = null,
  user = null,
  canScan = true,
  onExportReport,
  onShowAiGuide
}) {
  const [page, setPage] = useState(1);

  const displayPosts = posts || [];
  const totalPages = Math.max(1, Math.ceil(displayPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = displayPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const userAvatar = avatar || user?.profilePicture || user?.profilePictureUrl || user?.profile_picture_url || user?.avatar;

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
        <div className="tic-list-header-left">
          <PostAvatar
            src={userAvatar}
            name={user?.name}
            username={username}
            size={22}
          />
          <span className="tic-list-title">
            Bài viết của <strong>@{username || 'threads_user'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onShowAiGuide && (
            <button
              type="button"
              className="tic-guide-btn"
              onClick={onShowAiGuide}
              title="Xem giải thích các chỉ số và mô hình PhoBERT"
            >
              Hướng dẫn AI
            </button>
          )}
          {onExportReport && (
            <button
              type="button"
              className="tic-export-btn"
              onClick={onExportReport}
              title="Xuất bản tóm tắt hoặc tải file báo cáo AI"
            >
              Xuất báo cáo
            </button>
          )}
          <span className="tic-list-count">{displayPosts.length} bài</span>
        </div>
      </div>

      <div className="tic-list">
        {displayPosts.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có bài viết nào được tải.
          </div>
        ) : (
          paginated.map((post) => {
            const isSelected = selectedPostId ? (post.id === selectedPostId) : false;
            const itemAvatar = post.profilePictureUrl || post.profile_picture_url || post.avatar || userAvatar;
            const postUsername = post.username || `@${username || 'threads_user'}`;

            return (
              <div
                key={post.id}
                className={`tic-post-item ${isSelected ? 'tic-post-selected' : ''}`}
                onClick={() => onSelectPost?.(post.id)}
              >
                <div className="tic-post-head">
                  <div className="tic-user">
                    {/* Ảnh đại diện thật của người đăng nhập */}
                    <PostAvatar
                      src={itemAvatar}
                      name={user?.name}
                      username={postUsername}
                      size={28}
                    />

                    <div className="tic-user-meta">
                      <span className="tic-username">{postUsername.startsWith('@') ? postUsername : `@${postUsername}`}</span>
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
        disabled={scanning || !canScan}
        style={{ opacity: (scanning || !canScan) ? 0.6 : 1, cursor: (scanning || !canScan) ? 'not-allowed' : 'pointer' }}
        title={!canScan ? 'Bạn đã hết lượt phân tích hôm nay. Nâng cấp VIP để phân tích không giới hạn.' : undefined}
      >
        {scanning ? 'Đang phân tích...' : !canScan ? 'Hết lượt phân tích hôm nay' : 'Quét & Phân tích bài viết'}
      </button>
    </div>
  );
}
