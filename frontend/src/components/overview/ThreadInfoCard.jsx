export default function ThreadInfoCard({ onScan }) {
  return (
    <div className="tic-wrap">
      <div className="tic-header">
        <div className="tic-user">
          <div className="tic-avatar" />
          <div className="tic-user-meta">
            <span className="tic-username">@nguyenminh</span>
            <span className="tic-sep">•</span>
            <span className="tic-time">2 giờ trước</span>
          </div>
        </div>
        <span className="tic-active-badge">
          <span className="tic-pulse" />
          Active Thread
        </span>
      </div>

      <p className="tic-content">
        "Bạn nghĩ sao về công nghệ AI hiện nay? Anh em có thấy nó đang thay đổi
        tốc độ làm việc thực tế không?"
      </p>

      <div className="tic-stats">
        <span>♥ 1.2K</span>
        <span>↺ 328</span>
        <span>💬 184</span>
        <span className="tic-replies-found">
          <span className="tic-found-dot" />
          184 replies đã phát hiện
        </span>
      </div>

      <button className="tic-scan-btn" onClick={onScan}>
        ↻ Quét lại replies thời gian thực
      </button>
    </div>
  );
}
