import '../assets/styles/StatisticsPage.css';

/* ── Mini bar ── */
function Bar({ value, color, height = 3 }) {
  return (
    <div className="st-bar-track" style={{ height }}>
      <div className="st-bar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

/* ── Donut SVG ── */
function Donut() {
  const r = 48, cx = 60, cy = 60, stroke = 8;
  const circ = 2 * Math.PI * r;
  const segments = [
    { value: 42.6, color: '#10b981' },
    { value: 38.1, color: '#6b7280' },
    { value: 19.3, color: '#f87171' },
  ];
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
        fontSize="13" fontWeight="800">42.6%</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#10b981"
        fontSize="9" fontWeight="600">Tích cực</text>
    </svg>
  );
}

/* ── Line chart SVG ── */
function LineChart() {
  const W = 320, H = 110;
  const toxic   = [2,3,4,5,6,8,10,13,17,22,26,28];
  const negative = [5,7,9,11,14,17,20,24,28,31,33,32];

  const toX = (i, len) => 20 + (i / (len - 1)) * (W - 30);
  const toY = (v, max) => H - 10 - (v / max) * (H - 20);

  const pathD = (pts, max) =>
    pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i, pts.length)},${toY(v, max)}`).join(' ');

  const areaD = (pts, max) =>
    `${pathD(pts, max)} L${toX(pts.length - 1, pts.length)},${H - 10} L${toX(0, pts.length)},${H - 10} Z`;

  const max = 36;

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

/* ── Keywords ── */
const KEYWORDS = [
  { tag: '#AI',          count: 48,  color: '#10b981', bold: true },
  { tag: '#công nghệ',   count: 39,  color: '#10b981', bold: true },
  { tag: '#chất lượng',  count: 27,  color: null },
  { tag: '#trải nghiệm', count: 31,  color: '#22d3ee', bold: true },
  { tag: '#tương lai',   count: 19,  color: null },
  { tag: '#giá cả',      count: 22,  color: '#f87171', bold: false },
  { tag: '#sản phẩm',    count: 18,  color: null },
  { tag: '#tự động hóa', count: 14,  color: null },
];

export default function StatisticsPage() {
  return (
    <div className="st-wrap">

      {/* ── Hero card ── */}
      <div className="st-hero">
        <div className="st-hero-left">
          <div className="st-hero-title-row">
            <span className="st-hero-icon">〜</span>
            <h2 className="st-hero-title">Thống kê Threads Post</h2>
          </div>
          <p className="st-hero-sub">Báo cáo tổng quan dữ liệu 184 replies • Real-time stream</p>
        </div>
        <span className="st-hero-badge">
          <span className="st-hero-badge-dot" />
          Đã chốt số
        </span>
      </div>

      {/* ── Metric grid ── */}
      <div className="st-metric-grid">
        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">TỔNG REPLIES</span>
            <span className="st-metric-icon">💬</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">184</span>
            <span className="st-metric-delta">↗+12/h</span>
          </div>
          <Bar value={100} color="#22d3ee" />
        </div>

        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">ĐÃ PHÂN TÍCH</span>
            <span className="st-metric-icon" style={{ color: '#10b981' }}>⚖</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">184</span>
            <span className="st-metric-pct" style={{ color: '#10b981' }}>100%</span>
          </div>
          <Bar value={100} color="#10b981" />
        </div>

        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">PHẢN HỒI TOXIC</span>
            <span className="st-metric-icon" style={{ color: '#f59e0b' }}>⚠</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">18</span>
            <span className="st-metric-pct" style={{ color: '#f87171' }}>9.8%</span>
          </div>
          <Bar value={9.8} color="#f87171" />
        </div>

        <div className="st-metric-card">
          <div className="st-metric-head">
            <span className="st-metric-label">HATE SPEECH</span>
            <span className="st-metric-icon" style={{ color: '#f87171' }}>🛡</span>
          </div>
          <div className="st-metric-val-row">
            <span className="st-metric-val">11</span>
            <span className="st-metric-pct" style={{ color: '#f87171' }}>5.9%</span>
          </div>
          <Bar value={5.9} color="#f87171" />
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
          <Donut />
          <div className="st-sentiment-legend">
            {[
              { label: 'Tích cực (Positive)',  count: 78,  pct: '42.6%', color: '#10b981' },
              { label: 'Trung tính (Neutral)', count: 70,  pct: '38.1%', color: '#6b7280' },
              { label: 'Tiêu cực (Negative)',  count: 36,  pct: '19.3%', color: '#f87171' },
            ].map(s => (
              <div className="st-legend-row" key={s.label}>
                <span className="st-legend-dot" style={{ background: s.color }} />
                <span className="st-legend-label">{s.label}</span>
                <span className="st-legend-val" style={{ color: s.color }}>
                  {s.count} ({s.pct})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trend chart ── */}
      <div className="st-section">
        <div className="st-section-head">
          <span className="st-section-icon">〜</span>
          <span className="st-section-title">Xu hướng độc hại theo thời gian</span>
          <span className="st-section-meta">
            <span className="st-trend-dot" />
            T0 → +2h
          </span>
        </div>
        <div className="st-chart-wrap">
          <LineChart />
        </div>
        <div className="st-chart-xaxis">
          <span>00:00 (Post)</span>
          <span>+45m</span>
          <span>+1h 30m</span>
          <span style={{ color: '#f87171' }}>Hiện tại (+2h)</span>
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
      </div>

      {/* ── Keywords ── */}
      <div className="st-section">
        <div className="st-section-head">
          <span className="st-section-icon">#</span>
          <span className="st-section-title">Từ khóa nổi bật (Top Keywords)</span>
          <span className="st-section-meta">8 tags chính</span>
        </div>
        <div className="st-keywords">
          {KEYWORDS.map(k => (
            <span
              key={k.tag}
              className="st-kw-chip"
              style={k.color ? {
                color: k.color,
                background: `${k.color}15`,
                borderColor: `${k.color}30`,
                fontWeight: k.bold ? 700 : 500,
              } : {}}
            >
              {k.tag} <span className="st-kw-count">{k.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Model performance ── */}
      <div className="st-section">
        <div className="st-section-head">
          <span className="st-section-icon">⚙</span>
          <span className="st-section-title">Hiệu năng mô hình (PhoBERT)</span>
          <span className="st-badge-cyan">v2.1 VN</span>
        </div>
        <div className="st-perf-grid">
          {[
            { label: 'ACCURACY',    val: '94.8%', color: '#10b981' },
            { label: 'MACRO F1',    val: '92.6%', color: '#22d3ee' },
            { label: 'WEIGHTED F1', val: '95.1%', color: '#8b5cf6' },
          ].map(p => (
            <div className="st-perf-item" key={p.label}>
              <span className="st-perf-label">{p.label}</span>
              <span className="st-perf-val" style={{ color: p.color }}>{p.val}</span>
              <Bar value={parseFloat(p.val)} color={p.color} />
            </div>
          ))}
        </div>
        <p className="st-perf-note">
          Benchmark trên tập dữ liệu UIT-VSMEC &amp; Threads VN Corpus
        </p>
      </div>

      {/* ── Export ── */}
      <button className="st-export-btn">
        ↑ Xuất dữ liệu báo cáo
      </button>
      <div className="st-export-formats">
        {['.CSV', '.JSON', '.XLSX'].map(f => (
          <button key={f} className="st-format-btn">
            <span className="st-format-icon">
              {f === '.CSV' ? '⊞' : f === '.JSON' ? '{}' : '📄'}
            </span>
            {f}
          </button>
        ))}
      </div>

    </div>
  );
}