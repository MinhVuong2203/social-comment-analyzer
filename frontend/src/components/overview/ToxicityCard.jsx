const LEVELS = [
  { key: 'safe',   label: 'Safe',  color: '#10b981' },
  { key: 'low',    label: 'Low',   color: '#3b82f6' },
  { key: 'medium', label: 'Med',   color: '#f59e0b' },
  { key: 'high',   label: 'High',  color: '#ef4444' },
];

export default function ToxicityCard({ toxicity }) {
  const {
    overall = 98.1, label = 'Lành mạnh',
    safe = 71.4, low = 18.7, medium = 7.2, high = 2.7,
    hateNon = 94.2, hate = 5.8, hateCount = 11,
  } = toxicity ?? {};

  const values = { safe, low, medium, high };

  return (
    <div className="tc-wrap">
      <div className="tc-header">
        <span className="tc-title">🛡️ Mức độ Độc hại (Toxicity)</span>
        <span className="tc-overall-badge">{overall}% {label}</span>
      </div>

      <div className="tc-grid">
        {LEVELS.map((lv) => (
          <div className="tc-level-item" key={lv.key}>
            <span className="tc-level-label">{lv.label}</span>
            <span className="tc-level-value" style={{ color: lv.color }}>
              {values[lv.key]}%
            </span>
            <div className="tc-level-bar"
              style={{ background: lv.color, width: `${values[lv.key]}%`, maxWidth: '100%' }} />
          </div>
        ))}
      </div>

      <div className="tc-hate-row">
        <span className="tc-hate-icon">🛡️</span>
        <span className="tc-hate-label">Hate Speech Detection</span>
        <span className="tc-hate-non">Non-Hate: {hateNon}%</span>
        <span className="tc-hate-sep"> Hate: </span>
        <span className="tc-hate-val">{hate}% ({hateCount})</span>
      </div>
      <div className="tc-hate-prog">
        <div className="tc-hate-prog-fill" style={{ width: `${hateNon}%` }} />
      </div>
    </div>
  );
}
