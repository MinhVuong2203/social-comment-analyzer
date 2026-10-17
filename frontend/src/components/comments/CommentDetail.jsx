import { useState } from 'react';
import './CommentDetail.css';

// Mock data — replace with real props/API
const MOCK = {
  id: 8849,
  flagged: true,
  username: '@antifan_hater',
  verified: false,
  time: '18 phút trước',
  content: '"Toàn bánh vẽ lừa đảo chứ AI nổi gì, bọn làm tech chỉ biết chém gió vặt tiền người khác!"',
  highlights: ['lừa đảo', 'chém gió vặt tiền'],
  replies: 0,
  likes: 2,
  aggressiveness: 'High',
  sentiment: {
    positive: 2.1,
    neutral: 3.1,
    negative: 94.8,
  },
  toxicity: {
    safe: 5.2,
    low: 8.4,
    medium: 12.1,
    high: 74.3,
  },
  hatespeech: {
    nonHate: 91.2,
    hate: 8.8,
    score: 91,
    label: 'SAFE',
  },
  model: {
    architecture: 'PhoBERT Base',
    archSub: 'Vietnamese Transformer',
    language: 'Tiếng Việt (vi)',
    langSub: 'Tokenization: RDRsegmenter',
    confidence: 94.7,
    confSub: 'High Precision match',
    latency: '42 ms',
    latencySub: 'Edge-cached ONNX',
    status: 'VN-NLP READY',
  },
};

function highlight(text, words) {
  let result = text;
  words.forEach(w => {
    result = result.replace(
      new RegExp(`(${w})`, 'gi'),
      '<mark>$1</mark>'
    );
  });
  return result;
}

// Donut chart via SVG
function Donut({ value, color, label }) {
  const r = 28, cx = 36, cy = 36;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="11" fontWeight="700">{value}%</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#475569" fontSize="7.5" fontWeight="600">{label}</text>
    </svg>
  );
}

function Bar({ value, color, max = 100 }) {
  return (
    <div className="cd-bar-track">
      <div className="cd-bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

export default function CommentDetail({ onBack }) {
  const d = MOCK;
  const [hidden, setHidden] = useState(false);

  return (
    <div className="cd-wrap">

      {/* ── Top bar ── */}
      <div className="cd-topbar">
        <button className="cd-back-btn" onClick={onBack}>
          ← 
        </button>
        <div className="cd-topbar-title">
          <span className="cd-live-dot" />
          Chi tiết phân tích Reply
        </div>
        <span className="cd-flagged-badge">FLAGGED #{d.id}</span>
        <button className="cd-close-btn">✕</button>
      </div>

      {/* ── Original comment card ── */}
      <div className="cd-comment-card">
        <div className="cd-comment-head">
          <div className="cd-avatar">A</div>
          <div className="cd-comment-meta">
            <div className="cd-username-row">
              <span className="cd-username">{d.username}</span>
              <span className="cd-unverified">Unverified</span>
            </div>
            <span className="cd-time">{d.time}</span>
          </div>
          <a className="cd-source-link" href="#">Bài gốc ↗</a>
        </div>

        <p
          className="cd-comment-body"
          dangerouslySetInnerHTML={{ __html: highlight(d.content, d.highlights) }}
        />

        <div className="cd-comment-foot">
          <span className="cd-foot-stat">↩ {d.replies} replies</span>
          <span className="cd-foot-stat">♥ {d.likes} likes</span>
          <span className="cd-aggr-warn">⚠ Độ gay gắt cao</span>
        </div>
      </div>

      {/* ── Section 1: Sentiment ── */}
      <div className="cd-section">
        <div className="cd-section-head">
          <span className="cd-section-icon">🎯</span>
          <span className="cd-section-title">1. Emotion Classification</span>
          <span className="cd-section-badge cd-badge-neg">Negative</span>
        </div>
        <div className="cd-sentiment-rows">
          {[
            { label: 'Positive',  value: d.sentiment.positive,  color: '#10b981' },
            { label: 'Neutral',   value: d.sentiment.neutral,   color: '#6b7280' },
            { label: 'Negative',  value: d.sentiment.negative,  color: '#ef4444' },
          ].map(s => (
            <div className="cd-sent-row" key={s.label}>
              <span className="cd-sent-label">{s.label}</span>
              <Bar value={s.value} color={s.color} />
              <span className="cd-sent-val" style={{ color: s.color }}>{s.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Toxicity ── */}
      <div className="cd-section">
        <div className="cd-section-head">
          <span className="cd-section-icon">☣</span>
          <span className="cd-section-title">2. Toxicity Level</span>
          <span className="cd-section-badge cd-badge-danger">⚠ Serious Warning</span>
        </div>
        <div className="cd-tox-grid">
          {[
            { label: 'Safe',   value: d.toxicity.safe,   color: '#10b981' },
            { label: 'Low',    value: d.toxicity.low,    color: '#3b82f6' },
            { label: 'Medium', value: d.toxicity.medium, color: '#f59e0b' },
            { label: 'High',   value: d.toxicity.high,   color: '#ef4444' },
          ].map(t => (
            <div className="cd-tox-col" key={t.label}>
              <span className="cd-tox-label">{t.label}</span>
              <span className="cd-tox-val" style={{ color: t.color }}>{t.value}%</span>
              <div className="cd-tox-dot" style={{ background: t.color,
                boxShadow: t.label === 'High' ? `0 0 8px ${t.color}` : 'none' }} />
              {t.label === 'High' && (
                <Bar value={t.value} color={t.color} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Hate Speech ── */}
      <div className="cd-section">
        <div className="cd-section-head">
          <span className="cd-section-icon">🛡</span>
          <span className="cd-section-title">3. Hate Speech Analysis</span>
          <div className="cd-donut-wrap">
            <Donut value={d.hatespeech.score} color="#10b981" label={d.hatespeech.label} />
          </div>
        </div>
        <div className="cd-hate-row">
          <span className="cd-hate-item cd-hate-safe">
            <span className="cd-hate-dot" style={{ background: '#10b981' }} />
            Non-Hate: {d.hatespeech.nonHate}%
          </span>
          <span className="cd-hate-item cd-hate-bad">
            <span className="cd-hate-dot" style={{ background: '#f59e0b' }} />
            Hate: {d.hatespeech.hate}%
          </span>
        </div>
      </div>

      {/* ── Section 4: Model & Metadata ── */}
      <div className="cd-section">
        <div className="cd-section-head">
          <span className="cd-section-icon">⚙️</span>
          <span className="cd-section-title">4. Model & Metadata</span>
          <span className="cd-section-badge cd-badge-cyan">{d.model.status}</span>
        </div>
        <div className="cd-meta-grid">
          <div className="cd-meta-item">
            <span className="cd-meta-label">Architecture</span>
            <span className="cd-meta-val">{d.model.architecture}</span>
            <span className="cd-meta-sub">{d.model.archSub}</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Processing Language</span>
            <span className="cd-meta-val cd-meta-val--cyan">{d.model.language}</span>
            <span className="cd-meta-sub">{d.model.langSub}</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Overall Confidence</span>
            <div className="cd-conf-row">
              <span className="cd-meta-val cd-meta-val--cyan">{d.model.confidence}%</span>
              <span className="cd-conf-dot" />
            </div>
            <span className="cd-meta-sub">{d.model.confSub}</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Inference Latency</span>
            <span className="cd-meta-val cd-meta-val--cyan">{d.model.latency}</span>
            <span className="cd-meta-sub">{d.model.latencySub}</span>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="cd-actions">
        <button className="cd-btn-hide">
          <span>👁</span> Hide on Threads
        </button>
        <button className="cd-btn-report">
          <span>🚩</span> Report Violation
        </button>
      </div>

      <button className="cd-btn-json">
        &lt;/&gt; Copy JSON Analysis
      </button>

    </div>
  );
}