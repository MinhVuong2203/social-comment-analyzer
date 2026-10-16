import React from 'react';
import { Settings, Minus, X } from 'lucide-react';
import './Header.css';

const TABS = [
  { id: 'tongquan',  label: 'Tổng quan' },
  { id: 'binhluận', label: 'Bình luận' },
  { id: 'phantichai', label: 'Phân tích AI' },
  { id: 'thongke',  label: 'Thống kê' },
  { id: 'caidat',   label: 'Cài đặt' },
];

export default function Header({ activeTab = 'tongquan', onTabChange }) {
  return (
    <div className="header-container">
      {/* Top window bar */}
      <div className="header-top">
        <div className="app-branding">
          <div className="app-logo">
            <span className="logo-dots"></span>
            <span className="logo-dots"></span>
          </div>
          <div className="app-titles">
            <h1 className="app-title">Social Comment Analyzer</h1>
            <span className="app-subtitle">AI-powered Threads analysis</span>
          </div>
        </div>
        <div className="window-controls">
          <Settings size={15} className="control-icon" />
          <Minus size={15} className="control-icon" />
          <X size={15} className="control-icon" />
        </div>
      </div>

      {/* Status bar */}
      <div className="header-status">
        <div className="status-badge">
          <span className="status-dot"></span>
          Connected to Threads
        </div>
        <div className="status-version">V2.1.4 PRO</div>
      </div>

      {/* Navigation Tabs */}
      <div className="header-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange?.(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}