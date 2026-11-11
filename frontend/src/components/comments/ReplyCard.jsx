import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const SENTIMENT_META = {
  positive:    { label: 'Tích cực',       color: '#10b981', className: 'pos' },
  neutral:     { label: 'Trung tính',      color: '#94a3b8', className: 'neu' },
  negative:    { label: 'Tiêu cực',       color: '#f87171', className: 'neg' },
  unprocessed: { label: 'Chưa phân tích', color: '#eab308', className: 'unprocessed' },
};

function getAvatarUrl(username, user, customAvatar) {
  if (customAvatar) return customAvatar;
  const clean = (username || 'user').replace('@', '').trim();
  if (user && (user.username === clean || `@${user.username}` === username)) {
    if (user.profilePicture || user.avatar || user.profile_picture_url) {
      return user.profilePicture || user.avatar || user.profile_picture_url;
    }
  }
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(clean)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export default function ReplyCard({
  reply,
  childReplies = [],
  isChild = false,
  onAnalyzeSingle,
  isAnalyzing,
  analyzingId,
}) {
  const { user } = useAuth() || {};
  const [collapsed,   setCollapsed]   = useState(reply.hidden);
  const [showReplies, setShowReplies] = useState(true);
  const [imgError,    setImgError]    = useState(false);

  const sm          = SENTIMENT_META[reply.sentiment] ?? SENTIMENT_META.unprocessed;
  const isHigh      = reply.analyzed && (reply.toxicityLevel === 'High' || (reply.toxicity || 0) >= 60);
  const isViolating = reply.analyzed && reply.violating;
  const borderColor = isViolating ? '#ef4444' : isHigh ? '#f97316' : 'transparent';

  const cleanUser = (reply.username || 'user').replace('@', '').trim();
  const avatarUrl = getAvatarUrl(
    reply.username,
    user,
    reply.avatar || reply.profilePicture || reply.profile_picture_url
  );

  return (
    <div className="rc-thread-group">
      <div
        className={`rc-wrap ${isChild ? 'rc-child-card' : ''} ${isViolating ? 'rc-violating' : isHigh ? 'rc-high' : ''}`}
        style={{ borderLeftColor: borderColor }}
      >
        {/* ── header ── */}
        <div className="rc-header">
          <div className="rc-user-row">
            <div className="rc-avatar-container">
              {!imgError ? (
                <img
                  src={avatarUrl}
                  alt={reply.username || 'avatar'}
                  className="rc-avatar-img"
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
              ) : (
                <div
                  className="rc-avatar"
                  style={{
                    background: isViolating ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' :
                                isHigh      ? 'linear-gradient(135deg,#78350f,#f97316)' :
                                              'linear-gradient(135deg,#312e81,#6d28d9)',
                  }}
                >
                  {cleanUser.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="rc-user-info">
              <div className="rc-username-row">
                <span className="rc-username">{reply.username}</span>
                {isChild && (
                  <span className="rc-reply-to-badge">
                    Phản hồi {reply.replyToUser || 'bình luận'}
                  </span>
                )}
                {isViolating && <span className="rc-violation-badge">VI PHẠM</span>}
                {reply.flagged && !isViolating && <span className="rc-flagged-dot" />}
              </div>
              <span className="rc-time">{reply.time}</span>
            </div>
          </div>

          <div className="rc-right">
            {isAnalyzing ? (
              <span className="rc-badge" style={{ color: '#38bdf8', background: 'rgba(6,182,212,0.1)' }}>
                <span className="ct-spinner" style={{ width: 9, height: 9, marginRight: 4 }} />
                Đang phân tích...
              </span>
            ) : !reply.analyzed ? (
              <span className="rc-badge" style={{ color: '#facc15', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
                Chưa phân tích
              </span>
            ) : isViolating ? (
              <span className="rc-badge rc-badge--vio">Thù ghét {reply.hate}%</span>
            ) : isHigh ? (
              <span className="rc-badge rc-badge--high">Độc hại cao {reply.toxicity}%</span>
            ) : (
              <span className="rc-badge rc-badge--sm" style={{ color: sm.color, borderColor: sm.color }}>
                {sm.label} • {reply.sentimentScore}%
              </span>
            )}
            <button className="rc-more">⋮</button>
          </div>
        </div>

        {/* ── content ── */}
        {!collapsed ? (
          <p className="rc-content">{reply.content}</p>
        ) : (
          <div className="rc-hidden-row">
            <button className="rc-show-btn" onClick={() => setCollapsed(false)}>
              Nội dung đã bị ẩn
            </button>
            <button className="rc-reply-btn" onClick={() => setCollapsed(false)}>Hiện lại</button>
          </div>
        )}

        {/* ── metrics hiển thị trực tiếp tất cả thông số gọn gàng ── */}
        {reply.analyzed ? (
          <div className="rc-metrics-grid">
            {/* 1. Độ độc hại */}
            <div className={`rc-metric-item ${reply.toxicity > 60 ? 'm-danger' : reply.toxicity > 30 ? 'm-warning' : 'm-safe'}`}>
              <div className="rc-metric-top">
                <span className="rc-metric-title">Độc hại (Toxicity)</span>
                <span className="rc-metric-pct">{reply.toxicity ?? 0}%</span>
              </div>
              <div className="rc-metric-desc">
                {reply.toxicity > 60 ? 'Độc hại cao' : reply.toxicity > 30 ? 'Cảnh báo' : 'An toàn'}
              </div>
              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(reply.toxicity || 0, 100)}%`,
                    background: reply.toxicity > 60 ? '#ef4444' : reply.toxicity > 30 ? '#f97316' : '#10b981'
                  }}
                />
              </div>
            </div>

            {/* 2. Thù ghét */}
            <div className={`rc-metric-item ${reply.hate > 30 || isViolating ? 'm-danger' : 'm-safe'}`}>
              <div className="rc-metric-top">
                <span className="rc-metric-title">Thù ghét (Hate)</span>
                <span className="rc-metric-pct">{reply.hate ?? 0}%</span>
              </div>
              <div className="rc-metric-desc">
                {reply.hate > 30 || isViolating ? 'Vi phạm chuẩn mực' : 'Không vi phạm'}
              </div>
              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(reply.hate || 0, 100)}%`,
                    background: reply.hate > 30 || isViolating ? '#ef4444' : '#10b981'
                  }}
                />
              </div>
            </div>

            {/* 3. Sắc thái */}
            <div className="rc-metric-item m-sentiment">
              <div className="rc-metric-top">
                <span className="rc-metric-title">Sắc thái</span>
                <span className="rc-metric-pct" style={{ color: sm.color }}>{reply.sentimentScore ?? 0}%</span>
              </div>
              <div className="rc-metric-desc" style={{ color: sm.color }}>
                {sm.label}
              </div>
              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(reply.sentimentScore || 0, 100)}%`,
                    background: sm.color
                  }}
                />
              </div>
            </div>

            {/* 4. Độ tin cậy */}
            <div className="rc-metric-item m-conf">
              <div className="rc-metric-top">
                <span className="rc-metric-title">Độ tin cậy AI</span>
                <span className="rc-metric-pct" style={{ color: '#38bdf8' }}>{reply.confidence ?? 0}%</span>
              </div>
              <div className="rc-metric-desc" style={{ color: '#38bdf8' }}>
                PhoBERT v2.1
              </div>
              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(reply.confidence || 0, 100)}%`,
                    background: '#0284c7'
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rc-unprocessed-note">
            <span>Chưa phân tích PhoBERT — Bấm &quot;Phân tích&quot; để quét Toxicity &amp; Sắc thái</span>
          </div>
        )}

        {/* ── footer ── */}
        <div className="rc-footer">
          <span className="rc-foot-stats">
            {reply.likes > 0 && <span className="rc-likes-count">{reply.likes} thích</span>}
            {childReplies.length > 0 && (
              <button
                type="button"
                className="rc-toggle-replies-btn"
                onClick={() => setShowReplies(s => !s)}
                title="Bấm để xem các câu trả lời cho bình luận này"
              >
                <span>{showReplies ? 'Ẩn' : 'Xem'} {childReplies.length} phản hồi</span>
              </button>
            )}
            {childReplies.length === 0 && reply.replies > 0 && (
              <span className="rc-replies-count">{reply.replies} phản hồi</span>
            )}
            {(reply.likes === 0 && childReplies.length === 0 && (!reply.replies || reply.replies === 0)) && !isViolating && (
              <span className="rc-foot-near">Gần đây</span>
            )}
          </span>

          <div className="rc-action-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!reply.analyzed && onAnalyzeSingle && (
              <button
                className="cd-btn-reanalyze"
                style={{
                  padding: '5px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  margin: 0,
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyzeSingle(reply.id);
                }}
                disabled={isAnalyzing}
              >
                Phân tích
              </button>
            )}

            {isViolating && (
              <button className="rc-show-btn" onClick={() => setCollapsed(c => !c)}>
                {collapsed ? 'Hiện nội dung' : 'Ẩn nội dung'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CÂY THẢO LUẬN CON (NESTED REPLIES) ── */}
      {childReplies.length > 0 && showReplies && (
        <div className="rc-nested-container">
          {childReplies.map(child => (
            <div key={child.id} className="rc-child-wrap">
              <ReplyCard
                reply={child}
                isChild={true}
                childReplies={[]}
                onAnalyzeSingle={onAnalyzeSingle}
                isAnalyzing={isAnalyzing && analyzingId === child.id}
                analyzingId={analyzingId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
