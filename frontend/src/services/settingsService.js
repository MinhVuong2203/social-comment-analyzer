import { API_URL } from './authService';

/**
 * Service lấy trạng thái VIP và quota giới hạn của người dùng
 */
export async function getUserLimitStatus() {
  const res = await fetch(`${API_URL}/api/user/limit-status`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Không thể lấy trạng thái quota');
  return res.json();
}

/**
 * Service lấy cài đặt người dùng
 */
export async function getUserSettings() {
  const res = await fetch(`${API_URL}/api/user/settings`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Không thể lấy cài đặt');
  return res.json();
}

/**
 * Service lưu cài đặt người dùng
 */
export async function saveUserSettings(settings) {
  const res = await fetch(`${API_URL}/api/user/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Không thể lưu cài đặt');
  return res.json();
}
