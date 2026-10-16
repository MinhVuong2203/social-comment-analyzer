import { useState } from 'react';

/* helpers */
const SENTIMENT_META = {
  positive: { label: 'Tích cực',  color: '#10b981', className: 'pos' },
  neutral:  { label: 'Trung tính', color: '#6b7280', className: 'neu' },
  negative: { label: 'Tiêu cực',  color: '#f87171', className: 'neg' },
};

function ToxBar({ value, color }) {
  return (
    <div className="rc-bar-track">
      <div className="rc-bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

export default function ReplyCard({ reply }) {
  const [collapsed, setCollapsed] = useState(reply.hidden);

  const sm   = SENTIMENT_META[reply.sentiment] ?? SENTIMENT_META.neutral;
  const isHigh = reply.toxicityLevel === 'High' || reply.toxicity >= 60;
  const isViolating = reply.violating;

  /* border-left accent color */
  const borderColor = isViolating ? '#ef4444' : isHigh ? '#f97316' : 'transparent';

  return (
    <div
      className={`rc-wrap ${isViolating ? 'rc-violating' : isHigh ? 'rc-high' : ''}`}
      style={{ borderLeftColor: borderColor }}
    >
      {/* ── header ── */}
      <div className="rc-header">
        <div className="rc-user-row">
          <div className="rc-avatar" style={{
            background: isViolating ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' :
                        isHigh      ? 'linear-gradient(135deg,#78350f,#f97316)' :
                                      'linear-gradient(135deg,#312e81,#6d28d9)',
          }}>
            {reply.username.charAt(1).toUpperCase()}
          </div>
          <div className="rc-user-info">
            <div className="rc-username-row">
              <span className="rc-username">{reply.username}</span>
              {isViolating && <span className="rc-violation-badge">VI PHẠM</span>}
              {reply.flagged && !isViolating && <span className="rc-flagged-dot" />}
            </div>
            <span className="rc-time">{reply.time}</span>
          </div>
        </div>

        <div className="rc-right">
          {/* sentiment / toxicity badge */}
          {isViolating ? (
            <span className="rc-badge rc-badge--vio">🔴 Hate {reply.hate}%</span>
          ) : isHigh ? (
            <span className="rc-badge rc-badge--high">⚠ Toxicity {reply.toxicity}% • High</span>
          ) : (
            <span className="rc-badge rc-badge--sm" style={{ color: sm.color }}>
              ● {sm.label} • {reply.sentimentScore}%
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
            👁 Đã giới hạn hiển thị
          </button>
          <button className="rc-reply-btn">Ẩn reply</button>
        </div>
      )}

      {/* ── metrics ── */}
      <div className="rc-metrics">
        <div className="rc-metric">
          <span className="rc-metric-label">Toxicity</span>
          <span className="rc-metric-val" style={{ color: reply.toxicity > 60 ? '#ef4444' : '#6b7280' }}>
            {reply.toxicity}%
          </span>
          <ToxBar value={reply.toxicity}
            color={reply.toxicity > 60 ? '#ef4444' : reply.toxicity > 20 ? '#f97316' : '#6b7280'} />
        </div>
        <div className="rc-metric">
          <span className="rc-metric-label">Hate</span>
          <span className="rc-metric-val" style={{ color: reply.hate > 30 ? '#f87171' : '#6b7280' }}>
            {reply.hate}%
          </span>
          <ToxBar value={reply.hate}
            color={reply.hate > 30 ? '#f87171' : '#6b7280'} />
        </div>
        <div className="rc-metric rc-metric--conf">
          <span className="rc-metric-label">Confidence</span>
          <span className="rc-metric-val rc-metric-val--cyan">{reply.confidence}%</span>
        </div>
      </div>

      {/* ── footer ── */}
      <div className="rc-footer">
        <span className="rc-foot-stats">
          {reply.likes > 0 && <span>♥{reply.likes}</span>}
          {reply.replies > 0 && <span>↩{reply.replies}</span>}
          {(reply.likes === 0 && reply.replies === 0) && !isViolating && (
            <span className="rc-foot-near">↩Gần cã</span>
          )}
        </span>
        {isViolating && (
          <div className="rc-action-row">
            <button className="rc-show-btn" onClick={() => setCollapsed(c => !c)}>
              👁 {collapsed ? 'Hiện' : 'Ẩn'} reply
            </button>
            <button className="rc-detail-btn">Chi tiết ›</button>
          </div>
        )}
        {!isViolating && <button className="rc-detail-btn">Chi tiết ›</button>}
      </div>
    </div>
  );
}
