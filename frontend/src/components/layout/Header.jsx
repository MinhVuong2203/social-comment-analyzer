import React, { useState } from 'react';
import { Settings, Minus, X, LogOut, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AiGuideModal from '../common/AiGuideModal';
import './Header.css';

const TABS = [
  { id: 'overview', label: 'Tổng quan', path: '/overview' },
  { id: 'comments', label: 'Bình luận', path: '/comments' },
  // { id: 'ai-analysis',label: 'AI Analysis',  path: '/ai-analysis' },
  { id: 'statistics', label: 'Thống kê', path: '/statistics' },
  { id: 'profile', label: 'Cá nhân & VIP', path: '/profile' },
  { id: 'settings', label: 'Cài đặt', path: '/settings' },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAiGuide, setShowAiGuide] = useState(false);

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
          {/* Clickable User Profile Badge with Avatar */}
          <div
            className="user-profile-badge"
            onClick={() => navigate('/profile')}
            title="Nhấn để xem trang cá nhân & mua gói VIP"
          >
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Avatar"
                className="user-avatar-img"
              />
            ) : (
              <div className="user-avatar-fallback">
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            <span className="status-dot" />

            <span className="user-badge-name">
              {user?.name || (user?.username ? `@${user.username}` : 'Cá nhân & VIP')}
            </span>
          </div>

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
            <HelpCircle
              size={14}
              className="control-icon"
              title="Hướng dẫn mô hình PhoBERT AI"
              onClick={() => setShowAiGuide(true)}
            />
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

      <AiGuideModal
        isOpen={showAiGuide}
        onClose={() => setShowAiGuide(false)}
      />
    </div>
  );
}
