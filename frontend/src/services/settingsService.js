import { API_URL } from './authService';

const DEFAULT_SETTINGS = {
  theme: 'dark',
  toxicThreshold: 50,
  hateThreshold: 50,
  sentimentThreshold: 50,
};

/**
 * Service lấy trạng thái VIP và quota giới hạn của người dùng
 */
export async function getUserLimitStatus() {
  try {
    const res = await fetch(`${API_URL}/api/user/limit-status`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Không thể kết nối lấy limit status:', err);
  }
  return {
    isVipOrAdmin: true, // Cho phép trải nghiệm đầy đủ tính năng
    remainingAnalysis: 99,
    remainingExports: 99,
    dailyAnalyzeLimit: 99,
    dailyExportLimit: 99,
    usedAnalysis: 0,
    usedExports: 0,
  };
}

/**
 * Lấy cài đặt đã lưu trong localStorage (đồng bộ ngay lập tức)
 */
export function getLocalUserSettings() {
  try {
    const raw = localStorage.getItem('user-settings-thresholds');
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Service lấy cài đặt người dùng (ưu tiên gọi API, fallback localStorage)
 */
export async function getUserSettings() {
  try {
    const res = await fetch(`${API_URL}/api/user/settings`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      const merged = {
        theme: data.theme || 'dark',
        toxicThreshold: data.toxicThreshold ?? 50,
        hateThreshold: data.hateThreshold ?? 50,
        sentimentThreshold: data.sentimentThreshold ?? 50,
        isVip: data.isVip,
      };
      try {
        localStorage.setItem('user-settings-thresholds', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (err) {
    console.warn('Lỗi lấy settings từ backend, dùng fallback localStorage:', err);
  }
  return getLocalUserSettings();
}

/**
 * Service lưu cài đặt người dùng (lưu local ngay lập tức + sync backend)
 */
export async function saveUserSettings(settings) {
  // 1. Cập nhật localStorage ngay lập tức và bắn event cho các trang khác
  try {
    localStorage.setItem('user-settings-thresholds', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('app-settings-updated', { detail: settings }));
  } catch (e) {}

  // 2. Lưu vào backend nếu khả dụng
  try {
    const res = await fetch(`${API_URL}/api/user/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (backendErr) {
    console.warn('Backend chưa sẵn sàng, đã lưu cục bộ thành công:', backendErr);
  }
  return settings;
}
