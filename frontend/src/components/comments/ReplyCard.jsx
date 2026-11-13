import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const SENTIMENT_META = {
  positive:    { label: 'Tích cực',       color: '#10b981', className: 'pos' },
  neutral:     { label: 'Trung tính',      color: '#94a3b8', className: 'neu' },
  negative:    { label: 'Tiêu cực',       color: '#f87171', className: 'neg' },
  unprocessed: { label: 'Chưa phân tích', color: '#eab308', className: 'unprocessed' },
};

export const HATE_SPEECH_META = {
  CLEAN: {
    key: 'CLEAN',
    label: 'Clean',
    subLabel: 'Lành mạnh',
    color: '#10b981',
    className: 'rc-hate-clean'
  },
  OFFENSIVE: {
    key: 'OFFENSIVE',
    label: 'Offensive',
    subLabel: 'Xúc phạm',
    color: '#f59e0b',
    className: 'rc-hate-offensive'
  },
  HATE: {
    key: 'HATE',
    label: 'Hate',
    subLabel: 'Thù ghét',
    color: '#ef4444',
    className: 'rc-hate-hate'
  }
};

export function getHateSpeechInfo(reply) {
  let raw = (reply?.hateLabel || '').toUpperCase();
  if (!raw && reply?.rawPrediction?.hate_speech?.label) {
    raw = reply.rawPrediction.hate_speech.label.toUpperCase();
  }
  if (!raw) {
    if (reply?.violating || (reply?.hate && reply.hate >= 60)) raw = 'HATE';
    else if (reply?.hate && reply.hate >= 25) raw = 'OFFENSIVE';
    else raw = 'CLEAN';
  }

  let meta = HATE_SPEECH_META.CLEAN;
  if (raw.includes('HATE')) meta = HATE_SPEECH_META.HATE;
  else if (raw.includes('OFFENSIVE')) meta = HATE_SPEECH_META.OFFENSIVE;

  const score = reply?.hateScore ?? (reply?.hate !== undefined && reply.hate !== null ? reply.hate : (meta.key === 'CLEAN' ? 98 : 75));
  return { ...meta, score };
}

export function checkThresholdExceeded(reply, thresholds) {
  if (!reply || !reply.analyzed) return { isExceeded: false, reasons: [] };

  const toxThresh = thresholds?.toxicThreshold ?? 50;
  const hateThresh = thresholds?.hateThreshold ?? 50;
  const sentThresh = thresholds?.sentimentThreshold ?? 50;

  const reasons = [];

  // 1. Kiểm tra Toxicity
  const toxVal = reply.toxicity ?? 0;
  if (toxVal >= toxThresh) {
    reasons.push({
      key: 'toxic',
      title: 'Độ độc hại',
      value: toxVal,
      threshold: toxThresh,
      color: '#ef4444',
      badgeText: `Toxicity ${toxVal}% (≥${toxThresh}%)`
    });
  }

  // 2. Kiểm tra Hate Speech (Hate hoặc Offensive vượt ngưỡng)
  const hateInfo = getHateSpeechInfo(reply);
  if (hateInfo.key === 'HATE' && hateInfo.score >= hateThresh) {
    reasons.push({
      key: 'hate',
      title: 'Hate',
      value: hateInfo.score,
      threshold: hateThresh,
      color: '#ef4444',
      badgeText: `Hate ${hateInfo.score}% (≥${hateThresh}%)`
    });
  } else if (hateInfo.key === 'OFFENSIVE' && hateInfo.score >= hateThresh) {
    reasons.push({
      key: 'offensive',
      title: 'Offensive',
      value: hateInfo.score,
      threshold: hateThresh,
      color: '#f59e0b',
      badgeText: `Offensive ${hateInfo.score}% (≥${hateThresh}%)`
    });
  }

  // 3. Kiểm tra Sentiment Tiêu cực
  const sentLabel = (reply.sentiment || '').toLowerCase();
  const sentVal = reply.sentimentScore ?? 0;
  if (sentLabel === 'negative' && sentVal >= sentThresh) {
    reasons.push({
      key: 'sentiment',
      title: 'Tiêu cực',
      value: sentVal,
      threshold: sentThresh,
      color: '#f87171',
      badgeText: `Tiêu cực ${sentVal}% (≥${sentThresh}%)`
    });
  }

  return {
    isExceeded: reasons.length > 0,
    reasons,
    hasToxic: reasons.some(r => r.key === 'toxic'),
    hasHate: reasons.some(r => r.key === 'hate' || r.key === 'offensive'),
    hasSentiment: reasons.some(r => r.key === 'sentiment'),
  };
}

function getInitialBg(username) {
  const gradients = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #0ea5e9, #2563eb)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #8b5cf6, #d946ef)',
    'linear-gradient(135deg, #14b8a6, #0d9488)',
    'linear-gradient(135deg, #f97316, #ea580c)',
  ];
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getAvatarUrl(username, user, customAvatar) {
  if (customAvatar) return customAvatar;
  const clean = (username || 'user').replace('@', '').trim();
  if (user && (user.username === clean || `@${user.username}` === username)) {
    if (user.profilePicture || user.avatar || user.profile_picture_url) {
      return user.profilePicture || user.avatar || user.profile_picture_url;
    }
  }
  return null;
}

export default function ReplyCard({
  reply,
  childReplies = [],
  depth = 0,
  isChild = false,
  onAnalyzeSingle,
  isAnalyzing,
  analyzingId,
  thresholds = { toxicThreshold: 50, hateThreshold: 50, sentimentThreshold: 50 },
}) {
  const { user } = useAuth() || {};
  const [collapsed,   setCollapsed]   = useState(reply.hidden);
  const [showReplies, setShowReplies] = useState(true);
  const [imgError,    setImgError]    = useState(false);

  const sm          = SENTIMENT_META[reply.sentiment] ?? SENTIMENT_META.unprocessed;
  const hateInfo    = getHateSpeechInfo(reply);
  const thresholdExceeded = checkThresholdExceeded(reply, thresholds);

  // Phân loại mức độ Toxic: Safe / Warning / Toxic
  const toxScore = reply.toxicity ?? 0;
  let toxLevel = 'Safe';
  if (reply.rawPrediction?.toxicity?.label === 'TOXIC' || toxScore >= 60 || reply.toxicityLevel === 'High') {
    toxLevel = 'Toxic';
  } else if (toxScore >= 30) {
    toxLevel = 'Warning';
  } else {
    toxLevel = 'Safe';
  }
  const toxColor = toxLevel === 'Toxic' ? '#ef4444' : toxLevel === 'Warning' ? '#f59e0b' : '#10b981';

  // Sentiment key
  const sentKey = (reply.sentiment || 'neutral').toLowerCase();
  const sentColor = sentKey === 'positive' ? '#10b981' : sentKey === 'negative' ? '#f87171' : '#94a3b8';

  const isHigh      = reply.analyzed && (reply.toxicityLevel === 'High' || toxScore >= 60);
  const isViolating = reply.analyzed && (reply.violating || hateInfo.key === 'HATE');
  
  // Màu viền thẻ: Ưu tiên cảnh báo vượt ngưỡng > vi phạm > độc hại cao
  const borderColor = thresholdExceeded.isExceeded
    ? '#ef4444'
    : isViolating
      ? '#ef4444'
      : isHigh
        ? '#f97316'
        : 'transparent';

  const cleanUser = (reply.username || 'user').replace('@', '').trim();
  const avatarUrl = getAvatarUrl(
    reply.username,
    user,
    reply.profile_picture_url || reply.profilePicture || reply.avatar
  );

  return (
    <div className="rc-thread-group">
      <div
        className={`rc-wrap ${isChild ? 'rc-child-card' : ''} ${thresholdExceeded.isExceeded ? 'rc-threshold-exceeded' : isViolating ? 'rc-violating' : isHigh ? 'rc-high' : ''}`}
        style={{ borderLeftColor: borderColor }}
      >
        {/* ── header: NGANG HÀNG AVATAR, TÊN VÀ PHẦN HIỂN THỊ VƯỢT NGƯỠNG BÊN PHẢI ── */}
        <div className="rc-header">
          {/* Bên trái: Avatar + Tên + Thời gian */}
          <div className="rc-user-row">
            <div className="rc-avatar-container">
              {avatarUrl && !imgError ? (
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
                    background: thresholdExceeded.isExceeded ? 'linear-gradient(135deg,#991b1b,#ef4444)' :
                                isViolating ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' :
                                isHigh      ? 'linear-gradient(135deg,#78350f,#f97316)' :
                                              getInitialBg(cleanUser),
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: '#ffffff',
                    userSelect: 'none',
                  }}
                  title={reply.username}
                >
                  {(cleanUser.charAt(0) || 'U').toUpperCase()}
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
                {isViolating && !thresholdExceeded.isExceeded && (
                  <span className="rc-violation-badge">VI PHẠM</span>
                )}
                {reply.flagged && !isViolating && !thresholdExceeded.isExceeded && (
                  <span className="rc-flagged-dot" />
                )}
              </div>
              <span className="rc-time" title={reply.formattedTime || reply.time}>{reply.time}</span>
            </div>
          </div>

          {/* Bên phải (ngang hàng): Phần hiển thị vượt ngưỡng cài đặt hoặc badge trạng thái */}
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
            ) : thresholdExceeded.isExceeded ? (
              /* HIỂN THỊ VƯỢT NGƯỠNG NGANG HÀNG NẰM BÊN PHẢI */
              <div className="rc-header-exceeded-group">
                <div className="rc-header-exceeded-tags">
                  {thresholdExceeded.reasons.map((r, i) => (
                    <span key={i} className={`rc-threshold-tag-inline rc-threshold-tag-inline--${r.key}`}>
                      {r.badgeText}
                    </span>
                  ))}
                </div>
                <span
                  className="rc-badge rc-badge--exceeded"
                  title={`Ngưỡng cài đặt: Tox ≥${thresholds.toxicThreshold}% • Hate ≥${thresholds.hateThreshold}% • Sent ≥${thresholds.sentimentThreshold}%`}
                >
                  <span className="rc-pulse-dot" />
                  VƯỢT NGƯỠNG
                </span>
              </div>
            ) : hateInfo.key === 'HATE' ? (
              <span className="rc-badge rc-badge--vio">Hate {hateInfo.score}%</span>
            ) : hateInfo.key === 'OFFENSIVE' ? (
              <span className="rc-badge rc-badge--offensive">Offensive {hateInfo.score}%</span>
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

        {/* ── METRICS GRID: GỒM 3 Ô (TOXIC, HATE SPEECH, SẮC THÁI) ĐÃ THU GỌN CHIỀU CAO & BỎ ĐỘ TIN CẬY AI ── */}
        {reply.analyzed ? (
          <div className="rc-metrics-grid">
            {/* 1. Độ độc hại (Toxicity) - Sửa y như Hate speech: có thanh phân đoạn nhãn Safe / Warning / Toxic */}
            <div className={`rc-metric-item ${thresholdExceeded.hasToxic ? 'rc-metric-item--exceeded m-danger' : toxLevel === 'Toxic' ? 'm-danger' : toxLevel === 'Warning' ? 'm-warning' : 'm-safe'}`}>
              <div className="rc-metric-top">
                <span className="rc-metric-title">Độc hại (Toxicity)</span>
                {thresholdExceeded.hasToxic && (
                  <span className="rc-metric-exceeded-pill">⚠️ Vượt {thresholds.toxicThreshold}%</span>
                )}
                <span className="rc-metric-pct" style={{ color: toxColor }}>{reply.toxicity ?? 0}%</span>
              </div>

              {/* Segmented tags: Safe / Warning / Toxic */}
              <div className="rc-segments">
                <span className={`rc-seg ${toxLevel === 'Safe' ? 'active active--clean' : ''}`}>
                  Safe
                </span>
                <span className={`rc-seg ${toxLevel === 'Warning' ? 'active active--offensive' : ''}`}>
                  Warning
                </span>
                <span className={`rc-seg ${toxLevel === 'Toxic' ? 'active active--hate' : ''}`}>
                  Toxic
                </span>
              </div>

              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(reply.toxicity || 0, 100)}%`,
                    background: toxColor
                  }}
                />
              </div>
            </div>

            {/* 2. Hate Speech - Segmented tags: Clean / Offensive / Hate */}
            <div className={`rc-metric-item ${thresholdExceeded.hasHate ? 'rc-metric-item--exceeded m-danger' : hateInfo.key === 'HATE' ? 'm-danger' : hateInfo.key === 'OFFENSIVE' ? 'm-warning' : 'm-safe'}`}>
              <div className="rc-metric-top">
                <span className="rc-metric-title">Hate Speech</span>
                {thresholdExceeded.hasHate && (
                  <span className="rc-metric-exceeded-pill">⚠️ Vượt {thresholds.hateThreshold}%</span>
                )}
                <span className="rc-metric-pct" style={{ color: hateInfo.color }}>{hateInfo.score}%</span>
              </div>

              {/* Segmented tags: Clean / Offensive / Hate */}
              <div className="rc-segments">
                <span className={`rc-seg ${hateInfo.key === 'CLEAN' ? 'active active--clean' : ''}`}>
                  Clean
                </span>
                <span className={`rc-seg ${hateInfo.key === 'OFFENSIVE' ? 'active active--offensive' : ''}`}>
                  Offensive
                </span>
                <span className={`rc-seg ${hateInfo.key === 'HATE' ? 'active active--hate' : ''}`}>
                  Hate
                </span>
              </div>

              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(hateInfo.score || 0, 100)}%`,
                    background: hateInfo.color
                  }}
                />
              </div>
            </div>

            {/* 3. Sắc thái (Sentiment) - Sửa y như Hate speech: có thanh phân đoạn nhãn Positive / Neutral / Negative */}
            <div className={`rc-metric-item ${thresholdExceeded.hasSentiment ? 'rc-metric-item--exceeded m-danger' : sentKey === 'negative' ? 'm-danger' : sentKey === 'positive' ? 'm-safe' : 'm-neutral'}`}>
              <div className="rc-metric-top">
                <span className="rc-metric-title">Sắc thái</span>
                {thresholdExceeded.hasSentiment && (
                  <span className="rc-metric-exceeded-pill">⚠️ Vượt {thresholds.sentimentThreshold}%</span>
                )}
                <span className="rc-metric-pct" style={{ color: sentColor }}>{reply.sentimentScore ?? 0}%</span>
              </div>

              {/* Segmented tags: Positive / Neutral / Negative */}
              <div className="rc-segments">
                <span className={`rc-seg ${sentKey === 'positive' ? 'active active--clean' : ''}`}>
                  Positive
                </span>
                <span className={`rc-seg ${sentKey === 'neutral' ? 'active active--neu' : ''}`}>
                  Neutral
                </span>
                <span className={`rc-seg ${sentKey === 'negative' ? 'active active--hate' : ''}`}>
                  Negative
                </span>
              </div>

              <div className="rc-bar-track">
                <div
                  className="rc-bar-fill"
                  style={{
                    width: `${Math.min(reply.sentimentScore || 0, 100)}%`,
                    background: sentColor
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

            {(isViolating || thresholdExceeded.isExceeded) && (
              <button className="rc-show-btn" onClick={() => setCollapsed(c => !c)}>
                {collapsed ? 'Hiện nội dung' : 'Ẩn nội dung'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CÂY THẢO LUẬN CON (NESTED REPLIES: HIỂN THỊ ĐẦY ĐỦ CẢ REPLY CỦA REPLY) ── */}
      {childReplies.length > 0 && showReplies && (
        <div className="rc-nested-container" style={{ marginLeft: depth >= 3 ? '10px' : '18px' }}>
          {childReplies.map(child => (
            <div key={child.id} className="rc-child-wrap">
              <ReplyCard
                reply={child}
                isChild={true}
                depth={depth + 1}
                childReplies={child.children || []}
                onAnalyzeSingle={onAnalyzeSingle}
                isAnalyzing={isAnalyzing && analyzingId === child.id}
                analyzingId={analyzingId}
                thresholds={thresholds}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
