import { useState } from 'react';
import CommentDetail from './CommentDetail';

const SENTIMENT_META = {
  positive:    { label: 'Tích cực',       color: '#10b981', className: 'pos' },
  neutral:     { label: 'Trung tính',      color: '#6b7280', className: 'neu' },
  negative:    { label: 'Tiêu cực',       color: '#f87171', className: 'neg' },
  unprocessed: { label: 'Chưa phân tích', color: '#eab308', className: 'unprocessed' },
};

function ToxBar({ value, color }) {
  return (
    <div className="rc-bar-track">
      <div className="rc-bar-fill" style={{ width: `${Math.min(value || 0, 100)}%`, background: color }} />
    </div>
  );
}

export default function ReplyCard({ reply, onAnalyzeSingle, isAnalyzing }) {
  const [collapsed,  setCollapsed]  = useState(reply.hidden);
  const [showDetail, setShowDetail] = useState(false);

  const sm          = SENTIMENT_META[reply.sentiment] ?? SENTIMENT_META.unprocessed;
  const isHigh      = reply.analyzed && (reply.toxicityLevel === 'High' || (reply.toxicity || 0) >= 60);
  const isViolating = reply.analyzed && reply.violating;
  const borderColor = isViolating ? '#ef4444' : isHigh ? '#f97316' : 'transparent';

  if (showDetail) {
    return (
      <CommentDetail
        reply={reply}
        onBack={() => setShowDetail(false)}
        onReanalyze={onAnalyzeSingle}
        isAnalyzing={isAnalyzing}
      />
    );
  }

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
            {reply.username?.charAt(1)?.toUpperCase() || 'U'}
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
          {isAnalyzing ? (
            <span className="rc-badge" style={{ color: '#38bdf8', background: 'rgba(6,182,212,0.1)' }}>
              <span className="ct-spinner" style={{ width: 9, height: 9, marginRight: 4 }} />
              Đang phân tích...
            </span>
          ) : !reply.analyzed ? (
            <span className="rc-badge" style={{ color: '#facc15', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
              ⏳ Chưa phân tích
            </span>
          ) : isViolating ? (
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
      {reply.analyzed ? (
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
      ) : (
        <div className="rc-metrics" style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '6px 0', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
          ℹ Chưa chạy qua PhoBERT — Bấm &quot;Phân tích&quot; để quét Toxicity &amp; Sentiment
        </div>
      )}

      {/* ── footer ── */}
      <div className="rc-footer">
        <span className="rc-foot-stats">
          {reply.likes > 0 && <span>♥{reply.likes}</span>}
          {reply.replies > 0 && <span>↩{reply.replies}</span>}
          {(reply.likes === 0 && reply.replies === 0) && !isViolating && (
            <span className="rc-foot-near">↩Gần đây</span>
          )}
        </span>

        <div className="rc-action-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!reply.analyzed && onAnalyzeSingle && (
            <button
              className="cd-btn-reanalyze"
              style={{
                padding: '4px 10px',
                fontSize: '11px',
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
              ⚡ Phân tích
            </button>
          )}

          {isViolating && (
            <button className="rc-show-btn" onClick={() => setCollapsed(c => !c)}>
              👁 {collapsed ? 'Hiện' : 'Ẩn'} reply
            </button>
          )}

          <button className="rc-detail-btn" onClick={() => setShowDetail(true)}>
            Chi tiết ›
          </button>
        </div>
      </div>
    </div>
  );
}
