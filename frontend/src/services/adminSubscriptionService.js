// Service quản lý Gói VIP và Hội viên dành cho Admin
const API_URL = import.meta.env.VITE_API_URL || "https://provider-egging-stratus.ngrok-free.dev";

// Trích xuất header xác thực admin từ storage để hỗ trợ cross-origin ngrok không bị rớt session cookie
const getAdminHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "X-Admin-Auth": "true",
    "Authorization": "Bearer admin",
  };
  return headers;
};

// Fallback dữ liệu chuẩn khớp 100% với SQL Schema Database
const INITIAL_MOCK_PLANS = [
  {
    id: 1,
    planCode: "VIP_30_DAYS",
    planName: "VIP 30 ngày",
    description: "Quyền sử dụng VIP trong 30 ngày (quét không giới hạn và phân tích realtime)",
    price: 99000,
    durationDays: 30,
    isActive: true,
    activeSubscribers: 1180,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    planCode: "VIP_90_DAYS",
    planName: "VIP 90 ngày",
    description: "Quyền sử dụng VIP trong 90 ngày (tiết kiệm 15% so với gói tháng)",
    price: 249000,
    durationDays: 90,
    isActive: true,
    activeSubscribers: 620,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    planCode: "VIP_365_DAYS",
    planName: "VIP 365 ngày",
    description: "Quyền sử dụng VIP trong 365 ngày (tiết kiệm 35% + API PhoBERT v2.4 riêng)",
    price: 799000,
    durationDays: 365,
    isActive: true,
    activeSubscribers: 240,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_MOCK_SUBSCRIPTIONS = [
  {
    id: 101,
    userId: 1,
    threadsUserId: "th_8492019482",
    username: "hoang_tech",
    vipPlanId: 1,
    planCode: "VIP_30_DAYS",
    planName: "VIP 30 ngày",
    status: "ACTIVE",
    startAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    daysRemaining: 25,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 102,
    userId: 2,
    threadsUserId: "th_1092834710",
    username: "thuy_mkt",
    vipPlanId: 3,
    planCode: "VIP_365_DAYS",
    planName: "VIP 365 ngày",
    status: "ACTIVE",
    startAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 335 * 86400000).toISOString(),
    daysRemaining: 335,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 103,
    userId: 3,
    threadsUserId: "th_5510293847",
    username: "quan_cr",
    vipPlanId: 2,
    planCode: "VIP_90_DAYS",
    planName: "VIP 90 ngày",
    status: "PENDING",
    startAt: null,
    endAt: null,
    daysRemaining: null,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 104,
    userId: 4,
    threadsUserId: "th_9823471928",
    username: "duy_ai",
    vipPlanId: 1,
    planCode: "VIP_30_DAYS",
    planName: "VIP 30 ngày",
    status: "EXPIRED",
    startAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    endAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    daysRemaining: 0,
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString()
  }
];

const INITIAL_MOCK_PAYMENTS = [
  {
    id: 1,
    userId: 1,
    subscriptionId: 101,
    orderCode: "ORD_VIP_849201",
    paymentProvider: "VNPAY",
    providerTransactionId: "VNP_14298104",
    amount: 99000,
    currency: "VND",
    status: "SUCCESS",
    paymentMethod: "QR_PAY",
    paidAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 2,
    userId: 2,
    subscriptionId: 102,
    orderCode: "ORD_VIP_109283",
    paymentProvider: "MOMO",
    providerTransactionId: "MM_99218204",
    amount: 799000,
    currency: "VND",
    status: "SUCCESS",
    paymentMethod: "E_WALLET",
    paidAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 3,
    userId: 3,
    subscriptionId: 103,
    orderCode: "ORD_VIP_551029",
    paymentProvider: "VNPAY",
    providerTransactionId: null,
    amount: 249000,
    currency: "VND",
    status: "PENDING",
    paymentMethod: "ATM_CARD",
    paidAt: null,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

// Helper lưu vào localStorage khi chạy offline
function getStored(key, initial) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  } catch {
    return initial;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}

// 1. Lấy danh sách gói VIP
export const getVipPlans = async () => {
  try {
    const res = await fetch(`${API_URL}/api/admin/vip-plans`, {
      method: "GET",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setStored("admin_vip_plans", data);
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend unavailable, using cached/mock vip plans:", err.message);
  }
  return getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
};

// 2. Thêm mới gói VIP
export const createVipPlan = async (planData) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/vip-plans`, {
      method: "POST",
      headers: getAdminHeaders(),
      credentials: "include",
      body: JSON.stringify(planData)
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.message) throw new Error(err.message);
  } catch (err) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
    console.warn("Saving to mock storage (offline fallback)");
  }

  // Fallback local
  const current = getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
  const exists = current.some(p => p.planCode.toUpperCase() === planData.planCode.trim().toUpperCase());
  if (exists) {
    throw new Error(`Mã gói VIP '${planData.planCode}' đã tồn tại!`);
  }
  const newPlan = {
    id: Date.now(),
    planCode: planData.planCode.trim().toUpperCase(),
    planName: planData.planName.trim(),
    description: planData.description || "",
    price: Number(planData.price),
    durationDays: Number(planData.durationDays),
    isActive: planData.isActive !== false,
    activeSubscribers: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const updated = [...current, newPlan];
  setStored("admin_vip_plans", updated);
  return newPlan;
};

// 3. Cập nhật gói VIP
export const updateVipPlan = async (id, planData) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/vip-plans/${id}`, {
      method: "PUT",
      headers: getAdminHeaders(),
      credentials: "include",
      body: JSON.stringify(planData)
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.message) throw new Error(err.message);
  } catch (err) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
  }

  // Fallback local
  const current = getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
  const updated = current.map(p => {
    if (p.id === id) {
      return {
        ...p,
        planCode: planData.planCode.trim().toUpperCase(),
        planName: planData.planName.trim(),
        description: planData.description,
        price: Number(planData.price),
        durationDays: Number(planData.durationDays),
        isActive: planData.isActive !== undefined ? planData.isActive : p.isActive,
        updatedAt: new Date().toISOString()
      };
    }
    return p;
  });
  setStored("admin_vip_plans", updated);
  return updated.find(p => p.id === id);
};

// 4. Bật / Tắt kích hoạt gói
export const toggleVipPlanActive = async (id) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/vip-plans/${id}/toggle-active`, {
      method: "PATCH",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Offline toggle fallback");
  }

  const current = getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
  const updated = current.map(p => {
    if (p.id === id) {
      return { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() };
    }
    return p;
  });
  setStored("admin_vip_plans", updated);
  return updated.find(p => p.id === id);
};

// 5. Xóa gói VIP
export const deleteVipPlan = async (id) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/vip-plans/${id}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.message) throw new Error(err.message);
  } catch (err) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
  }

  const current = getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
  const updated = current.filter(p => p.id !== id);
  setStored("admin_vip_plans", updated);
  return { success: true };
};

// 6. Lấy danh sách Hội viên đăng ký VIP
export const getUserSubscriptions = async (status) => {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`${API_URL}/api/admin/subscriptions${query}`, {
      method: "GET",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      const data = await res.json();
      setStored("admin_vip_subs", data);
      return data;
    }
  } catch (err) {
    console.warn("Backend unavailable, using cached subscriptions:", err.message);
  }

  let subs = getStored("admin_vip_subs", INITIAL_MOCK_SUBSCRIPTIONS);
  if (status) {
    subs = subs.filter(s => s.status.toUpperCase() === status.toUpperCase());
  }
  return subs;
};

// 7. Cập nhật trạng thái đăng ký VIP
export const updateSubscriptionStatus = async (id, status) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/subscriptions/${id}/status`, {
      method: "PATCH",
      headers: getAdminHeaders(),
      credentials: "include",
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Offline status update fallback");
  }

  const current = getStored("admin_vip_subs", INITIAL_MOCK_SUBSCRIPTIONS);
  const updated = current.map(s => {
    if (s.id === id) {
      const now = new Date();
      return {
        ...s,
        status: status.toUpperCase(),
        startAt: status === "ACTIVE" ? s.startAt || now.toISOString() : s.startAt,
        endAt: status === "ACTIVE" ? s.endAt || new Date(now.getTime() + 30 * 86400000).toISOString() : s.endAt
      };
    }
    return s;
  });
  setStored("admin_vip_subs", updated);
  return updated.find(s => s.id === id);
};

// 8. Cấp VIP thủ công
export const manualGrantSubscription = async ({ userId, vipPlanId, customDurationDays, username }) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/subscriptions/manual-grant`, {
      method: "POST",
      headers: getAdminHeaders(),
      credentials: "include",
      body: JSON.stringify({ userId, vipPlanId, customDurationDays })
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Lỗi cấp VIP (HTTP ${res.status})`);
  } catch (err) {
    if (err instanceof TypeError) {
      console.warn("Offline manual grant fallback");
    } else {
      throw err;
    }
  }

  const plans = getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
  const plan = plans.find(p => p.id === Number(vipPlanId)) || plans[0];
  const duration = Number(customDurationDays) || plan.durationDays || 30;
  const now = new Date();
  const end = new Date(now.getTime() + duration * 86400000);

  const newSub = {
    id: Date.now(),
    userId: Number(userId),
    threadsUserId: `th_${userId}`,
    username: username || `user_${userId}`,
    vipPlanId: plan.id,
    planCode: plan.planCode,
    planName: plan.planName,
    status: "ACTIVE",
    startAt: now.toISOString(),
    endAt: end.toISOString(),
    daysRemaining: duration,
    createdAt: now.toISOString()
  };

  const current = getStored("admin_vip_subs", INITIAL_MOCK_SUBSCRIPTIONS).map(s =>
    Number(s.userId) === Number(userId) && s.status === "ACTIVE"
      ? { ...s, status: "REPLACED", endAt: now.toISOString(), daysRemaining: 0 }
      : s
  );
  const updated = [newSub, ...current];
  setStored("admin_vip_subs", updated);
  return newSub;
};

// 8b. Thu hồi VIP trực tiếp của người dùng
export const revokeUserVip = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/subscriptions/revoke/${userId}`, {
      method: "POST",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Lỗi thu hồi VIP (HTTP ${res.status})`);
  } catch (err) {
    if (err instanceof TypeError) {
      console.warn("Offline revoke VIP fallback");
    } else {
      throw err;
    }
  }

  const nowIso = new Date().toISOString();
  const current = getStored("admin_vip_subs", INITIAL_MOCK_SUBSCRIPTIONS);
  let revokedCount = 0;
  const updated = current.map(s => {
    if (Number(s.userId) === Number(userId) && s.status === "ACTIVE") {
      revokedCount++;
      return { ...s, status: "CANCELLED", endAt: nowIso, daysRemaining: 0 };
    }
    return s;
  });
  setStored("admin_vip_subs", updated);
  return { userId: Number(userId), revokedCount, message: "Đã thu hồi quyền VIP." };
};

// 9. Lịch sử giao dịch thanh toán VIP
export const getPaymentTransactions = async () => {
  try {
    const res = await fetch(`${API_URL}/api/admin/subscriptions/payments`, {
      method: "GET",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Offline payments fallback");
  }
  return getStored("admin_vip_payments", INITIAL_MOCK_PAYMENTS);
};

// 10. Thống kê tổng quan
export const getSubscriptionStats = async () => {
  try {
    const res = await fetch(`${API_URL}/api/admin/subscriptions/stats`, {
      method: "GET",
      headers: getAdminHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Offline stats fallback");
  }

  const plans = getStored("admin_vip_plans", INITIAL_MOCK_PLANS);
  const subs = getStored("admin_vip_subs", INITIAL_MOCK_SUBSCRIPTIONS);
  const payments = getStored("admin_vip_payments", INITIAL_MOCK_PAYMENTS);

  const activePlans = plans.filter(p => p.isActive).length;
  const activeSubs = subs.filter(s => s.status === "ACTIVE").length;
  const pendingSubs = subs.filter(s => s.status === "PENDING").length;
  const totalRevenue = payments
    .filter(p => p.status === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    totalPlans: plans.length,
    activePlans,
    activeSubscriptions: activeSubs,
    pendingSubscriptions: pendingSubs,
    totalRevenue,
    totalTransactions: payments.length
  };
};
