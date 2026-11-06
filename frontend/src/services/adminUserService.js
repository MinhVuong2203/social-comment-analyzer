const API_URL = import.meta.env.VITE_API_URL || "https://provider-egging-stratus.ngrok-free.dev";

const getAdminHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  try {
    const adminAuth = sessionStorage.getItem("admin_auth") || localStorage.getItem("admin_auth");
    if (adminAuth) {
      headers["X-Admin-Auth"] = "true";
    }
  } catch (e) {
    // Ignore storage errors
  }
  return headers;
};

export const getAdminUsers = async () => {
  const response = await fetch(`${API_URL}/api/admin/users`, {
    method: "GET",
    credentials: "include",
    headers: getAdminHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Lỗi lấy danh sách người dùng (${response.status})`);
  }

  return await response.json();
};

export const lockUser = async (userId, duration, reason = "") => {
  const response = await fetch(`${API_URL}/api/admin/users/${userId}/lock`, {
    method: "POST",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify({ duration, reason }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Lỗi khóa người dùng (${response.status})`);
  }

  return await response.json();
};

export const unlockUser = async (userId) => {
  const response = await fetch(`${API_URL}/api/admin/users/${userId}/unlock`, {
    method: "POST",
    credentials: "include",
    headers: getAdminHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Lỗi mở khóa người dùng (${response.status})`);
  }

  return await response.json();
};
