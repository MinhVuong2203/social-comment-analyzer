import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const ICON_MAP = {
  success: <CheckCircle2 className="toast-icon-svg toast-icon-success" size={18} />,
  error: <AlertCircle className="toast-icon-svg toast-icon-error" size={18} />,
  warning: <AlertTriangle className="toast-icon-svg toast-icon-warning" size={18} />,
  info: <Info className="toast-icon-svg toast-icon-info" size={18} />,
};

export default function Toast({ id, type = 'info', message, duration = 3500, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!duration || duration <= 0) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose?.();
      }, 300); // match exit animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  return (
    <div
      className={`toast-item toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
    >
      <div className="toast-icon-wrap">
        {ICON_MAP[type] || ICON_MAP.info}
      </div>

      <div className="toast-content">
        <span className="toast-message">{message}</span>
      </div>

      <button
        type="button"
        className="toast-close-btn"
        onClick={handleManualClose}
        aria-label="Đóng thông báo"
      >
        <X size={14} />
      </button>

      {duration > 0 && (
        <div
          className="toast-progress-bar"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
}

