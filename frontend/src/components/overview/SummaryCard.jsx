export default function SummaryCard({ stats }) {
  const { analyzed = 184, phobert = 96.8, total = 184 } = stats ?? {};
  const pct = Math.round((analyzed / total) * 100);

  return (
    <div className="sc-wrap">
      <div className="sc-header">
        <span className="sc-title">✦ AI Analysis Summary</span>
        <span className="sc-done-badge">
          <span className="sc-done-dot" /> Đã hoàn thành
        </span>
      </div>

      <div className="sc-metrics">
        <div className="sc-metric">
          <span className="sc-metric-label">REPLIES PHÂN TÍCH</span>
          <div className="sc-metric-value">
            {analyzed}
            <span className="sc-metric-sub">100% thread</span>
          </div>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">ĐỘ TIN CẬY PHOBERT</span>
          <div className="sc-metric-value sc-cyan">
            {phobert}%
            <span className="sc-metric-sub">avg</span>
          </div>
        </div>
      </div>

      <div className="sc-progress-row">
        <span>Tiến trình giải mã token</span>
        <span className="sc-progress-count">{analyzed} / {total} ({pct}%)</span>
      </div>
      <div className="sc-prog-bar">
        <div className="sc-prog-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
