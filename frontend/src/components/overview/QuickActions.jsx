const ACTIONS = [
  { icon: '🖥️', label: 'Xem 184 replies',  id: 'view-replies' },
  { icon: '🔍', label: 'Phân tích sâu',    id: 'deep-analysis' },
  { icon: '📊', label: 'Biểu đồ số liệu', id: 'charts' },
  { icon: '🔽', label: 'Lọc Toxic (18)',   id: 'filter-toxic', hot: true },
];

export default function QuickActions({ onAction, onExport }) {
  return (
    <div className="qa-wrap">
      <div className="qa-header">
        <span className="qa-title">HÀNH ĐỘNG NHANH</span>
        <span className="qa-version">v2.1 Shortcuts</span>
      </div>

      <div className="qa-grid">
        {ACTIONS.map((a) => (
          <button key={a.id} className="qa-btn" onClick={() => onAction?.(a.id)}>
            <span className="qa-btn-icon">{a.icon}</span>
            <span className="qa-btn-label">{a.label}›</span>
            {a.hot && <span className="qa-hot-badge">HOT</span>}
          </button>
        ))}
      </div>

      <button className="qa-export-btn" onClick={onExport}>
        ⬇ Xuất báo cáo dữ liệu (.CSV / .JSON)
      </button>
    </div>
  );
}
