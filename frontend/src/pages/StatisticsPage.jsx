import { useEffect, useState } from 'react';
import '../assets/styles/StatisticsPage.css';
import { apiService } from '../services/apiService';
import { useVipStatus } from '../hooks/useVipStatus';
import { useNavigate } from 'react-router-dom';

const SENTIMENT_COLORS = {
  POSITIVE: '#10b981',
  NEUTRAL: '#6b7280',
  NEGATIVE: '#f87171',
};

const STATUS_BADGES = {
  FINALIZED:       { label: 'Đã chốt số',     modifier: '' },
  HAS_NEW_REPLIES: { label: 'Có reply mới',   modifier: 'st-hero-badge--warn' },
  NOT_ANALYZED:    { label: 'Chưa phân tích', modifier: 'st-hero-badge--warn' },
  NO_REPLIES:      { label: 'Chưa có reply',  modifier: 'st-hero-badge--muted' },
};

const EXPORT_FORMATS = [
  { id: 'csv',  label: '.CSV',  icon: '⊞' },
  { id: 'json', label: '.JSON', icon: '{}' },
  { id: 'xlsx', label: '.XLSX', icon: '📄' },
];

/* Vị trí 4 nhãn trên trục thời gian, trong 12 mốc của biểu đồ */
const XAXIS_POINT_INDEXES = [0, 4, 7, 11];

function formatElapsed(minutes) {
  if (minutes < 60) return `+${minutes}m`;
  if (minutes < 1440) {
    const m = minutes % 60;
    return `+${Math.floor(minutes / 60)}h${m ? ` ${m}m` : ''}`;
  }
  const h = Math.floor((minutes % 1440) / 60);
  return `+${Math.floor(minutes / 1440)}d${h ? ` ${h}h` : ''}`;
}

/* ── Mini bar ── */
function Bar({ value, color, height = 3 }) {
  return (
    <div className="st-bar-track" style={{ height }}>
      <div className="st-bar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

/* ── Donut SVG ── */
function Donut({ stats }) {
  const r = 48, cx = 60, cy = 60, stroke = 8;
  const circ = 2 * Math.PI * r;
  const segments = [
    { value: stats.positive.percent, color: SENTIMENT_COLORS.POSITIVE, label: 'Tích cực' },
    { value: stats.neutral.percent,  color: SENTIMENT_COLORS.NEUTRAL,  label: 'Trung tính' },
    { value: stats.negative.percent, color: SENTIMENT_COLORS.NEGATIVE, label: 'Tiêu cực' },
  ];
  const dominant = segments.reduce((best, s) => (s.value > best.value ? s : best));
  const hasData = stats.analyzedReplies > 0;
  let offset = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {segments.map((s, i) => {
        const dash = (s.value / 100) * circ;
        const gap  = circ - dash;
        const rotate = -90 + (offset / 100) * 360;
        offset += s.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="butt"
            transform={`rotate(${rotate} ${cx} ${cy})`} />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9"
        fontSize="13" fontWeight="800">{hasData ? `${dominant.value}%` : '—'}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill={hasData ? dominant.color : '#6b7280'}
        fontSize="9" fontWeight="600">{hasData ? dominant.label : 'Chưa có dữ liệu'}</text>
    </svg>
  );
}

/* ── Line chart SVG ── */
function LineChart({ points }) {
  const W = 320, H = 110;
  const toxic    = points.map(p => p.toxic);
  const negative = points.map(p => p.negative);

  const toX = (i, len) => 20 + (i / (len - 1)) * (W - 30);
  const toY = (v, max) => H - 10 - (v / max) * (H - 20);

  const pathD = (pts, max) =>
    pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i, pts.length)},${toY(v, max)}`).join(' ');

  const areaD = (pts, max) =>
    `${pathD(pts, max)} L${toX(pts.length - 1, pts.length)},${H - 10} L${toX(0, pts.length)},${H - 10} Z`;

  const max = Math.max(1, ...toxic, ...negative) * 1.1;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="gtox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gneg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i}
          x1="20" y1={10 + t * (H - 20)}
          x2={W - 10} y2={10 + t * (H - 20)}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      {/* areas */}
      <path d={areaD(negative, max)} fill="url(#gneg)" />
      <path d={areaD(toxic,    max)} fill="url(#gtox)" />
      {/* lines */}
      <path d={pathD(negative, max)} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={pathD(toxic,    max)} fill="none" stroke="#f87171" strokeWidth="2"   strokeLinejoin="round" />
      {/* end dots */}
      <circle cx={toX(toxic.length - 1, toxic.length)}    cy={toY(toxic[toxic.length - 1], max)}    r="3.5" fill="#f87171" />
      <circle cx={toX(negative.length - 1, negative.length)} cy={toY(negative[negative.length - 1], max)} r="3.5" fill="#8b5cf6" />
    </svg>
  );
}

function TrendSection({ trend }) {
  const { points, skippedReplies, startsAtPost } = trend;
  const hasPoints = points.length > 0;
  const lastMinutes = hasPoints ? points[points.length - 1].minutesFromStart : 0;

  return (
    <div className="st-section">
      <div className="st-section-head">
        <span className="st-section-icon">〜</span>
        <span className="st-section-title">Xu hướng độc hại theo thời gian</span>
        {hasPoints && <span className="st-section-meta">T0 → {formatElapsed(lastMinutes)}</span>}
      </div>
      {hasPoints ? (
        <>
          <div className="st-chart-wrap">
            <LineChart points={points} />
          </div>
          <div className="st-chart-xaxis">
            {XAXIS_POINT_INDEXES.map((pointIndex, i) => (
              <span key={pointIndex} style={i === XAXIS_POINT_INDEXES.length - 1 ? { color: '#f87171' } : undefined}>
                {i === 0
                  ? `T0 (${startsAtPost ? 'Bài đăng' : 'Reply đầu'})`
                  : formatElapsed(points[pointIndex].minutesFromStart)}
              </span>
            ))}
          </div>
          <div className="st-chart-legend">
            <span className="st-chart-legend-item">
              <span className="st-chart-dot" style={{ background: '#f87171' }} />
              Lượng Toxic phản hồi
            </span>
            <span className="st-chart-legend-item">
              <span className="st-chart-dot" style={{ background: '#8b5cf6' }} />
              Bình luận tiêu cực tổng
            </span>
          </div>
        </>
      ) : (
        <p className="st-empty">Chưa có reply đã phân tích để vẽ biểu đồ.</p>
      )}
      {skippedReplies > 0 && (
        <p className="st-note">{skippedReplies} reply không có thời gian hợp lệ nên không được tính vào biểu đồ.</p>
      )}
    </div>
  );
}

function StatisticsContent({ stats }) {
  const sentiments = [
    { label: 'Tích cực (Positive)',  data: stats.positive, color: SENTIMENT_COLORS.POSITIVE },
    { label: 'Trung tính (Neutral)', data: stats.neutral,  color: SENTIMENT_COLORS.NEUTRAL },
    { label: 'Tiêu cực (Negative)',  data: stats.negative, color: SENTIMENT_COLORS.NEGATIVE },
  ];

  return (
    <>
      {/* ── Metric grid ── */}
      <div className="st-metric-grid">
        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">TỔNG REPLIES</span>
            <span className="st-metric-icon">💬</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">{stats.totalReplies}</span>
            {stats.repliesLastHour > 0 && (
              <span className="st-metric-delta">↗+{stats.repliesLastHour}/h</span>
            )}
          </div>
          <Bar value={stats.totalReplies > 0 ? 100 : 0} color="#22d3ee" />
        </div>

        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">ĐÃ PHÂN TÍCH</span>
            <span className="st-metric-icon" style={{ color: '#10b981' }}>⚖</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">{stats.analyzedReplies}</span>
            <span className="st-metric-pct" style={{ color: '#10b981' }}>{stats.analyzedPercent}%</span>
          </div>
          <Bar value={stats.analyzedPercent} color="#10b981" />
        </div>

        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">PHẢN HỒI TOXIC</span>
            <span className="st-metric-icon" style={{ color: '#f59e0b' }}>⚠</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">{stats.toxic.count}</span>
            <span className="st-metric-pct" style={{ color: '#f87171' }}>{stats.toxic.percent}%</span>
          </div>
          <Bar value={stats.toxic.percent} color="#f87171" />
        </div>

        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">HATE SPEECH</span>
            <span className="st-metric-icon" style={{ color: '#f87171' }}>🛡</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">{stats.hate.count}</span>
            <span className="st-metric-pct" style={{ color: '#f87171' }}>{stats.hate.percent}%</span>
          </div>
          <Bar value={stats.hate.percent} color="#f87171" />
        </div>
      </div>

      {/* ── Sentiment donut ── */}
      <div className="st-section">
        <div className="st-section-head">
          <span className="st-section-icon">⊕</span>
          <span className="st-section-title">Phân bố cảm xúc (Sentiment)</span>
          <span className="st-section-meta">3 sắc thái</span>
        </div>
        <div className="st-sentiment-body">
          <Donut stats={stats} />
          <div className="st-sentiment-legend">
            {sentiments.map(s => (
              <div className="st-legend-row" key={s.label}>
                <span className="st-legend-dot" style={{ background: s.color }} />
                <span className="st-legend-label">{s.label}</span>
                <span className="st-legend-val" style={{ color: s.color }}>
                  {s.data.count} ({s.data.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trend chart ── */}
      <TrendSection trend={stats.trend} />

      {/* ── Keywords ── */}
      <div className="st-section">
        <div className="st-section-head">
          <span className="st-section-icon">#</span>
          <span className="st-section-title">Từ khóa nổi bật (Top Keywords)</span>
          <span className="st-section-meta">{stats.keywords.length} tags chính</span>
        </div>
        {stats.keywords.length > 0 ? (
          <div className="st-keywords">
            {stats.keywords.map(k => {
              const color = k.sentiment === 'NEUTRAL' ? null : SENTIMENT_COLORS[k.sentiment];
              return (
                <span
                  key={k.term}
                  className="st-kw-chip"
                  style={color ? {
                    color,
                    background: `${color}15`,
                    borderColor: `${color}30`,
                    fontWeight: 700,
                  } : {}}
                >
                  #{k.term} <span className="st-kw-count">{k.count}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="st-empty">Chưa đủ dữ liệu: cần ít nhất 2 bình luận đã phân tích chứa cùng một từ.</p>
        )}
      </div>
    </>
  );
}

export default function StatisticsPage() {
  const navigate = useNavigate();
  const vipStatus = useVipStatus();
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  useEffect(() => {
    let ignore = false;
    apiService.getPosts()
      .then(list => {
        if (ignore) return;
        setPosts(list || []);
        setSelectedPostId(list?.[0]?.id ?? null);
      })
      .catch(err => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setPostsLoading(false);
      });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!selectedPostId) return undefined;
    let ignore = false;
    apiService.getPostStatistics(selectedPostId)
      .then(stats => {
        if (!ignore) setResult({ postId: selectedPostId, stats });
      })
      .catch(err => {
        if (!ignore) setResult({ postId: selectedPostId, error: err.message });
      });
    return () => { ignore = true; };
  }, [selectedPostId]);

  // Chỉ dùng kết quả của đúng bài đang chọn, để không hiện số liệu bài cũ khi đang tải bài mới
  const current = result?.postId === selectedPostId ? result : null;
  const stats = current?.stats ?? null;
  const pageError = error ?? current?.error ?? null;
  const loading = postsLoading || (selectedPostId !== null && current === null);
  const badge = stats ? STATUS_BADGES[stats.status] : null;

  const pendingReplies = stats ? Math.max(0, stats.totalReplies - stats.analyzedReplies) : 0;

  const handleSelectPost = (postId) => {
    setExportError(null);
    setAnalyzeError(null);
    setSelectedPostId(postId);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    // Kiểm tra quota phân tích
    if (!vipStatus.isVipOrAdmin && vipStatus.remainingAnalysis === 0) {
      setAnalyzeError(`Bạn đã hết ${vipStatus.dailyAnalyzeLimit} lần phân tích trong ngày hôm nay. Nâng cấp VIP để phân tích không giới hạn.`);
      setAnalyzing(false);
      return;
    }
    try {
      await apiService.analyzePost(selectedPostId);
      const fresh = await apiService.getPostStatistics(selectedPostId);
      setResult({ postId: selectedPostId, stats: fresh });
      vipStatus.refresh();
    } catch (err) {
      setAnalyzeError(`${err.message}. Hãy chắc chắn AI Service đang chạy.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = async () => {
    if (!selectedPostId) return;
    // Kiểm tra quota xuất báo cáo
    if (!vipStatus.isVipOrAdmin && vipStatus.remainingExports === 0) {
      setExportError(`Bạn đã hết ${vipStatus.dailyExportLimit} lần xuất báo cáo trong ngày hôm nay. Nâng cấp VIP để xuất không giới hạn.`);
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const blob = await apiService.exportPostStatistics(selectedPostId, exportFormat);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `thong-ke-${selectedPostId}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      vipStatus.refresh();
    } catch (err) {
      if (err.message && err.message.includes('429')) {
        setExportError(`Bạn đã đạt giới hạn ${vipStatus.dailyExportLimit} lần xuất báo cáo trong ngày. Nâng cấp VIP để xuất không giới hạn.`);
      } else {
        setExportError(err.message);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="st-wrap">

      {/* ── Quota Banner (non-VIP) ── */}
      {!vipStatus.loading && !vipStatus.isVipOrAdmin && (
        <div style={{
          padding: '7px 10px',
          background: vipStatus.remainingExports === 0
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(245,158,11,0.07)',
          border: `1px solid ${vipStatus.remainingExports === 0
            ? 'rgba(239,68,68,0.25)'
            : 'rgba(245,158,11,0.2)'}`,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 2,
        }}>
          <span style={{ fontSize: 10, color: vipStatus.remainingExports === 0 ? '#f87171' : '#fbbf24' }}>
            Lượt xuất báo cáo: <strong>{vipStatus.remainingExports}/{vipStatus.dailyExportLimit}</strong> còn lại hôm nay.
            {' '}<span style={{ color: '#94a3b8' }}>Nâng cấp VIP để xuất không giới hạn.</span>
          </span>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '2px 8px',
              background: 'rgba(255,215,0,0.1)',
              border: '1px solid rgba(255,215,0,0.25)',
              color: '#ffd700',
              borderRadius: 5,
              fontSize: 9.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Nâng cấp VIP
          </button>
        </div>
      )}

      {/* ── Hero card ── */}
      <div className="st-hero">
        <div className="st-hero-left">
          <div className="st-hero-title-row">
            <span className="st-hero-icon">〜</span>
            <h2 className="st-hero-title">Thống kê Threads Post</h2>
          </div>
          <p className="st-hero-sub">
            {stats ? `Báo cáo tổng quan dữ liệu ${stats.totalReplies} replies` : 'Báo cáo tổng quan theo bài viết'}
          </p>
        </div>
        {badge && (
          <span className={`st-hero-badge ${badge.modifier}`}>
            <span className="st-hero-badge-dot" />
            {badge.label}
          </span>
        )}
      </div>

      {/* ── Chọn bài viết ── */}
      {posts.length > 0 && (
        <select
          className="st-post-select"
          aria-label="Chọn bài viết"
          value={selectedPostId ?? ''}
          disabled={analyzing}
          onChange={e => handleSelectPost(e.target.value)}
        >
          {posts.map(p => (
            <option key={p.id} value={p.id}>
              {p.text?.trim() ? p.text.trim().slice(0, 70) : `Bài viết ${p.id}`}
            </option>
          ))}
        </select>
      )}

      {pageError && <p className="st-error">⚠️ {pageError}</p>}
      {loading && <p className="st-empty">Đang tải thống kê...</p>}
      {!loading && !pageError && posts.length === 0 && (
        <p className="st-empty">Chưa có bài viết nào để thống kê.</p>
      )}

      {stats && !stats.repliesSynced && (
        <p className="st-error">
          ⚠️ Không lấy được reply từ Threads, số liệu dưới đây chỉ từ dữ liệu đã lưu. Hãy thử đăng nhập lại.
        </p>
      )}

      {pendingReplies > 0 && (
        <div className="st-analyze">
          <span className="st-analyze-text">{pendingReplies} reply chưa được phân tích</span>
          <button className="st-analyze-btn" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? 'Đang phân tích...' : 'Phân tích ngay'}
          </button>
        </div>
      )}
      {analyzeError && <p className="st-error">⚠️ {analyzeError}</p>}

      {stats && <StatisticsContent stats={stats} />}

      {/* ── Export ── */}
      {stats && (
        <>
          <button
            className="st-export-btn"
            onClick={handleExport}
            disabled={exporting || stats.totalReplies === 0}
          >
            ↑ {exporting ? 'Đang xuất...' : 'Xuất dữ liệu báo cáo'}
          </button>
          <div className="st-export-formats">
            {EXPORT_FORMATS.map(f => (
              <button
                key={f.id}
                className={`st-format-btn ${exportFormat === f.id ? 'st-format-btn--active' : ''}`}
                aria-pressed={exportFormat === f.id}
                onClick={() => setExportFormat(f.id)}
              >
                <span className="st-format-icon">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
          {exportError && <p className="st-error">⚠️ {exportError}</p>}
        </>
      )}

    </div>
  );
}
