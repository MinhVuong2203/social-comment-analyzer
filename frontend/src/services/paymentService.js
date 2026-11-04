// Service thanh toán PayOS và thông tin cá nhân của người dùng
const API_URL = import.meta.env.VITE_API_URL || "https://nonruinously-glariest-kyler.ngrok-free.dev";

export const getUserProfile = async () => {
  const response = await fetch(`${API_URL}/api/user/profile`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Không thể lấy thông tin trang cá nhân.");
  }

  return await response.json();
};

export const createPayOSPayment = async ({ vipPlanId, returnUrl, cancelUrl }) => {
  const response = await fetch(`${API_URL}/api/payments/payos/create`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vipPlanId, returnUrl, cancelUrl }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể tạo liên kết thanh toán PayOS.");
  }

  return data;
};

export const checkPaymentStatus = async (orderCode) => {
  const response = await fetch(`${API_URL}/api/payments/payos/check/${orderCode}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể kiểm tra trạng thái đơn hàng.");
  }

  return data;
};

export const cancelPayOSPayment = async (orderCode, reason = "User cancelled") => {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  const response = await fetch(`${API_URL}/api/payments/payos/cancel/${orderCode}${query}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể hủy thanh toán.");
  }

  return data;
};

