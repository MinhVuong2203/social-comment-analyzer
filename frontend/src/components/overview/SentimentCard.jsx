function SentimentDonut({ positive, neutral, negative, netScore }) {
  const R = 32, CX = 40, CY = 40;
  const CIRC = 2 * Math.PI * R;
  const posLen = (positive / 100) * CIRC;
  const neuLen = (neutral  / 100) * CIRC;
  const negLen = (negative / 100) * CIRC;
  const startOff = CIRC * 0.25;

  return (
    <div className="sd-donut-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* track */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        {/* positive */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="#10b981" strokeWidth="9"
          strokeDasharray={`${posLen} ${CIRC}`}
          strokeDashoffset={startOff}
          transform={`rotate(-90 ${CX} ${CY})`} />
        {/* neutral */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="#4b5563" strokeWidth="9"
          strokeDasharray={`${neuLen} ${CIRC}`}
          strokeDashoffset={startOff - posLen}
          transform={`rotate(-90 ${CX} ${CY})`} />
        {/* negative */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="#f87171" strokeWidth="9"
          strokeDasharray={`${negLen} ${CIRC}`}
          strokeDashoffset={startOff - posLen - neuLen}
          transform={`rotate(-90 ${CX} ${CY})`} />
      </svg>
      <div className="sd-donut-center">
        <span className="sd-donut-label">Net</span>
        <span className="sd-donut-score">+{netScore}</span>
      </div>
    </div>
  );
}

export default function SentimentCard({ sentiment }) {
  const {
    positive = { count: 78,  percent: 42.6 },
    neutral  = { count: 70,  percent: 38.1 },
    negative = { count: 36,  percent: 19.3 },
    netScore = 23,
  } = sentiment ?? {};

  const LEGEND = [
    { label: 'Tích cực',  color: '#10b981', count: positive.count, pct: positive.percent },
    { label: 'Trung tính',color: '#6b7280', count: neutral.count,  pct: neutral.percent  },
    { label: 'Tiêu cực',  color: '#f87171', count: negative.count, pct: negative.percent },
  ];

  return (
    <div className="sd-wrap">
      <div className="sd-header">
        <span className="sd-title">✦ Phân loại Sentiment</span>
        <span className="sd-tag">3-Class Vector</span>
      </div>

      <div className="sd-body">
        <SentimentDonut
          positive={positive.percent} neutral={neutral.percent}
          negative={negative.percent} netScore={netScore}
        />
        <div className="sd-legend">
          {LEGEND.map((item) => (
            <div className="sd-legend-item" key={item.label}>
              <span className="sd-legend-dot" style={{ background: item.color }} />
              <span className="sd-legend-label">{item.label}</span>
              <span className="sd-legend-val">{item.pct}% ({item.count})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sd-bar">
        <div style={{ width:`${positive.percent}%`, background:'#10b981', height:'100%', borderRadius:'3px 0 0 3px' }} />
        <div style={{ width:`${neutral.percent}%`,  background:'#4b5563', height:'100%' }} />
        <div style={{ width:`${negative.percent}%`, background:'#f87171', height:'100%', borderRadius:'0 3px 3px 0' }} />
      </div>
    </div>
  );
}
