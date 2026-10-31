import React, { useState } from 'react';
import { Settings, Minus, X, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const TABS = [
  { id: 'overview',   label: 'Tổng quan',    path: '/overview' },
  { id: 'comments',   label: 'Bình luận',    path: '/comments' },
  { id: 'ai-analysis',label: 'AI Analysis', path: '/ai-analysis' },
  { id: 'statistics', label: 'Thống kê',  path: '/statistics' },
  { id: 'settings',   label: 'Cài đặt',    path: '/settings' },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

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

        <div className="header-top-right">
          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Đăng xuất khỏi tài khoản"
          >
            <LogOut size={13} className="logout-icon" />
            <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
          </button>

          <div className="window-controls">
            <Settings
              size={14}
              className="control-icon"
              title="Cài đặt"
              onClick={() => navigate('/settings')}
            />
            <Minus size={14} className="control-icon" title="Thu nhỏ" />
            <X
              size={14}
              className="control-icon"
              title="Đóng"
              onClick={() => {
                if (typeof window !== 'undefined' && window.close) {
                  window.close();
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="header-status">
        <div className="status-badge" title={user?.name ? `${user.name} (@${user.username})` : undefined}>
          <span className="status-dot" />
          {user?.username ? `@${user.username}` : (user?.name || 'Connected to Threads')}
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
