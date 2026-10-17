import React from 'react';
import { Settings, Minus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const TABS = [
  { id: 'overview',   label: 'Overview',    path: '/overview' },
  { id: 'comments',   label: 'Comments',    path: '/comments' },
  { id: 'ai-analysis',label: 'AI Analysis', path: '/ai-analysis' },
  { id: 'statistics', label: 'Statistics',  path: '/statistics' },
  { id: 'settings',   label: 'Settings',    path: '/settings' },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="header-container">

      <div className="header-top">
        <div className="app-branding">
          <div className="app-logo">💬</div>
          <div className="app-titles">
            <h1 className="app-title">Social Comment Analyzer</h1>
            <span className="app-subtitle">AI-powered Threads analysis</span>
          </div>
        </div>
        <div className="window-controls">
          <Settings size={14} className="control-icon" />
          <Minus    size={14} className="control-icon" />
          <X        size={14} className="control-icon" />
        </div>
      </div>

      <div className="header-status">
        <div className="status-badge">
          <span className="status-dot" />
          Connected to Threads
        </div>
        <div className="status-version">V2.1.4 PRO</div>
      </div>

      <div className="header-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${location.pathname === tab.path ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </div>

    </div>
  );
}