import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, saveUserSettings } from '../services/settingsService';
import { useVipStatus } from '../hooks/useVipStatus';
import '../assets/styles/SettingsPage.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isVipOrAdmin } = useVipStatus();

  const [settings, setSettings] = useState({
    theme: 'dark',
    toxicThreshold: 50,
    hateThreshold: 50,
    sentimentThreshold: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserSettings();
        setSettings({
          theme: data.theme || 'dark',
          toxicThreshold: data.toxicThreshold ?? 50,
          hateThreshold: data.hateThreshold ?? 50,
          sentimentThreshold: data.sentimentThreshold ?? 50,
        });
        // Áp dụng theme ngay khi load
        applyTheme(data.theme || 'dark');
      } catch (e) {
        console.warn('Lỗi load settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  };

  const handleThemeChange = (theme) => {
    setSettings(s => ({ ...s, theme }));
    applyTheme(theme);
  };

  const handleSlider = (key, value) => {
    setSettings(s => ({ ...s, [key]: Number(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserSettings(settings);
      showToast('Đã lưu cài đặt thành công!');
    } catch (e) {
      showToast('Lỗi khi lưu cài đặt: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, color: '#94a3b8', fontSize: 12 }}>Đang tải cài đặt...</div>
    );
  }

  const profilePic = user?.profilePicture || user?.profilePictureUrl;
  const displayName = user?.name || user?.username || 'Người dùng';
  const username = user?.username;
  const userId = user?.id;

  return (
    <div className="settings-page">
      {/* Toast */}
      {toast && (
        <div className={`settings-toast ${toast.type === 'error' ? 'settings-toast--error' : 'settings-toast--success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => navigate(-1)} title="Quay lại">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h2 className="settings-title">Cài đặt</h2>
          <p className="settings-subtitle">Tuỳ chỉnh giao diện và ngưỡng cảnh báo</p>
        </div>
      </div>

      <div className="settings-body">

        {/* ======================== */}
        {/* 1. THÔNG TIN NGƯỜI DÙNG */}
        {/* ======================== */}
        <section className="settings-section">
          <h3 className="settings-section-title">Thông tin tài khoản</h3>

          <div className="settings-profile-card">
            <div className="settings-avatar">
              {profilePic ? (
                <img src={profilePic} alt="Avatar" className="settings-avatar-img" />
              ) : (
                <div className="settings-avatar-placeholder">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {isVipOrAdmin && (
                <div className="settings-vip-badge" title="VIP Member">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              )}
            </div>

            <div className="settings-profile-info">
              <div className="settings-profile-name">
                {displayName}
                {isVipOrAdmin && (
                  <span className="settings-vip-label">VIP</span>
                )}
              </div>
              {username && (
                <div className="settings-profile-username">@{username}</div>
              )}
              <div className="settings-profile-meta">
                <span>Trạng thái:</span>
                <strong style={{ color: '#10b981' }}>Đang hoạt động</strong>
              </div>
              {userId && (
                <div className="settings-profile-meta">
                  <span>Threads ID:</span>
                  <code className="settings-code">{userId}</code>
                </div>
              )}
              <div className="settings-profile-meta">
                <span>Gói:</span>
                <strong style={{ color: isVipOrAdmin ? '#ffd700' : '#94a3b8' }}>
                  {isVipOrAdmin ? 'VIP Member' : 'Free (Dùng thử)'}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* ======================== */}
        {/* 2. GIAO DIỆN */}
        {/* ======================== */}
        <section className="settings-section">
          <h3 className="settings-section-title">Giao diện</h3>
          <p className="settings-section-desc">Chọn chủ đề hiển thị cho ứng dụng</p>

          <div className="settings-theme-row">
            <button
              className={`settings-theme-btn ${settings.theme === 'dark' ? 'settings-theme-btn--active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="settings-theme-preview settings-theme-preview--dark">
                <div className="settings-theme-preview-bar" />
                <div className="settings-theme-preview-content">
                  <div className="settings-theme-preview-line" />
                  <div className="settings-theme-preview-line settings-theme-preview-line--short" />
                </div>
              </div>
              <span className="settings-theme-label">Tối</span>
              {settings.theme === 'dark' && (
                <div className="settings-theme-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>

            <button
              className={`settings-theme-btn ${settings.theme === 'light' ? 'settings-theme-btn--active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <div className="settings-theme-preview settings-theme-preview--light">
                <div className="settings-theme-preview-bar settings-theme-preview-bar--light" />
                <div className="settings-theme-preview-content">
                  <div className="settings-theme-preview-line settings-theme-preview-line--light" />
                  <div className="settings-theme-preview-line settings-theme-preview-line--short settings-theme-preview-line--light" />
                </div>
              </div>
              <span className="settings-theme-label">Sáng</span>
              {settings.theme === 'light' && (
                <div className="settings-theme-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* ======================== */}
        {/* 3. NGƯỠNG CẢNH BÁO */}
        {/* ======================== */}
        <section className="settings-section">
          <div className="settings-section-head">
            <h3 className="settings-section-title">Ngưỡng cảnh báo AI</h3>
            {!isVipOrAdmin && (
              <span className="settings-vip-lock-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Chỉ VIP
              </span>
            )}
          </div>
          <p className="settings-section-desc">
            {isVipOrAdmin
              ? 'Điều chỉnh ngưỡng % để hệ thống tạo cảnh báo cho từng loại mô hình AI.'
              : 'Nâng cấp VIP để tùy chỉnh ngưỡng cảnh báo cho từng mô hình AI.'}
          </p>

          {/* Toxic Threshold */}
          <div className={`settings-threshold-group ${!isVipOrAdmin ? 'settings-threshold-group--locked' : ''}`}>
            <div className="settings-threshold-row">
              <div className="settings-threshold-info">
                <span className="settings-threshold-label">Toxicity</span>
                <span className="settings-threshold-desc">Phát hiện ngôn từ độc hại</span>
              </div>
              <div className="settings-threshold-value" style={{ color: '#f87171' }}>
                {settings.toxicThreshold}%
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.toxicThreshold}
              onChange={e => handleSlider('toxicThreshold', e.target.value)}
              disabled={!isVipOrAdmin}
              className="settings-slider settings-slider--toxic"
            />
            <div className="settings-slider-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Hate Speech Threshold */}
          <div className={`settings-threshold-group ${!isVipOrAdmin ? 'settings-threshold-group--locked' : ''}`}>
            <div className="settings-threshold-row">
              <div className="settings-threshold-info">
                <span className="settings-threshold-label">Hate Speech</span>
                <span className="settings-threshold-desc">Phát hiện ngôn từ thù ghét</span>
              </div>
              <div className="settings-threshold-value" style={{ color: '#f59e0b' }}>
                {settings.hateThreshold}%
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.hateThreshold}
              onChange={e => handleSlider('hateThreshold', e.target.value)}
              disabled={!isVipOrAdmin}
              className="settings-slider settings-slider--hate"
            />
            <div className="settings-slider-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Sentiment Threshold */}
          <div className={`settings-threshold-group ${!isVipOrAdmin ? 'settings-threshold-group--locked' : ''}`}>
            <div className="settings-threshold-row">
              <div className="settings-threshold-info">
                <span className="settings-threshold-label">Sentiment</span>
                <span className="settings-threshold-desc">Phân tích cảm xúc bình luận</span>
              </div>
              <div className="settings-threshold-value" style={{ color: '#8b5cf6' }}>
                {settings.sentimentThreshold}%
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.sentimentThreshold}
              onChange={e => handleSlider('sentimentThreshold', e.target.value)}
              disabled={!isVipOrAdmin}
              className="settings-slider settings-slider--sentiment"
            />
            <div className="settings-slider-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {!isVipOrAdmin && (
            <button
              className="settings-upgrade-btn"
              onClick={() => navigate('/profile')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Nâng cấp VIP để mở khóa
            </button>
          )}
        </section>

        {/* Save Button */}
        <button
          className="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="settings-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Đang lưu...
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Lưu cài đặt
            </>
          )}
        </button>

      </div>
    </div>
  );
}
