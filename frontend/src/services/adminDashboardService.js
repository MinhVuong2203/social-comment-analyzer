// Service tổng hợp dữ liệu Admin Dashboard
const API_URL = import.meta.env.VITE_API_URL || "https://provider-egging-stratus.ngrok-free.dev";

const getAdminHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  try {
    const adminAuth = sessionStorage.getItem("admin_auth") || localStorage.getItem("admin_auth");
    if (adminAuth) {
      headers["X-Admin-Auth"] = "true";
      headers["Authorization"] = "Bearer admin";
    }
  } catch (e) {
    // Ignore storage errors
  }
  return headers;
};

// Định dạng số rút gọn (ví dụ 1420 -> 1.4K, 184200 -> 184.2K)
export const formatCompactNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const n = Number(num);
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return n.toLocaleString("vi-VN");
};

// Định dạng tiền tệ VND (ví dụ 48500000 -> 48.5M ₫ hoặc 48.500.000 ₫)
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "0 ₫";
  const num = Number(amount);
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M ₫";
  }
  return num.toLocaleString("vi-VN") + " ₫";
};

// Định dạng thời gian tương đối ("Vừa xong", "15p trước", "2h trước", "Hôm qua")
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "Gần đây";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Gần đây";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin}p trước`;
  if (diffHour < 24) return `${diffHour}h trước`;
  if (diffDay === 1) return "Hôm qua";
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

// Lấy thống kê phân tích độc lập cho Biểu đồ (theo mốc ngày thực tế)
export const getChartAnalysisStats = async (days = null) => {
  const headers = getAdminHeaders();
  const fetchOptions = {
    method: "GET",
    credentials: "include",
    headers,
  };
  try {
    const url = (days !== null && days !== undefined)
      ? `${API_URL}/api/admin/statistics?days=${days}`
      : `${API_URL}/api/admin/statistics`;
    const res = await fetch(url, fetchOptions);
    if (!res.ok) return null;
    const stats = await res.json();
    const totalComments = Number(stats?.totalCommentsAnalyzed ?? 0);
    const toxicCount = Number(stats?.toxicCount ?? 0);
    const nonToxicCount = Number(stats?.nonToxicCount ?? 0);
    const cleanCount = Number(stats?.cleanCount ?? 0);
    const offensiveCount = Number(stats?.offensiveCount ?? 0);
    const hateCount = Number(stats?.hateCount ?? 0);
    const positiveCount = Number(stats?.positiveCount ?? 0);
    const neutralCount = Number(stats?.neutralCount ?? 0);
    const negativeCount = Number(stats?.negativeCount ?? 0);
    const totalPosts = Number(stats?.totalPostsAnalyzed ?? 0);

    return {
      totalComments,
      totalPosts,
      toxic: toxicCount,
      nonToxic: nonToxicCount,
      clean: cleanCount,
      offensive: offensiveCount,
      hate: hateCount,
      positive: positiveCount,
      neutral: neutralCount,
      negative: negativeCount,
      safePercentage: totalComments > 0 ? Math.round((nonToxicCount / totalComments) * 100) : 100,
    };
  } catch (err) {
    console.warn("Lỗi lấy thống kê phân tích biểu đồ:", err.message);
    return null;
  }
};

// Lấy danh sách bài viết nóng có lượng bình luận độc hại cao nhất (Top 3)
export const getToxicPostsAlerts = async (limit = 3) => {
  const headers = getAdminHeaders();
  const fetchOptions = {
    method: "GET",
    credentials: "include",
    headers,
  };
  try {
    const res = await fetch(`${API_URL}/api/admin/toxic-posts-alerts?limit=${limit}`, fetchOptions);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("Lỗi lấy danh sách bài viết nóng:", err.message);
    return [];
  }
};

// Lấy toàn bộ số liệu cho Admin Dashboard (hỗ trợ lọc thời gian thực tế từ backend)
export const getAdminDashboardData = async ({ days = null } = {}) => {
  const headers = getAdminHeaders();
  const fetchOptions = {
    method: "GET",
    credentials: "include",
    headers,
  };

  const daysParam = (days !== null && days !== undefined) ? `?days=${days}` : "";

  // 1. Fetch hệ thống (user count, lượt comment phân tích)
  const statsPromise = fetch(`${API_URL}/api/admin/statistics${daysParam}`, fetchOptions)
    .then(async (res) => (res.ok ? await res.json() : null))
    .catch((err) => {
      console.warn("Lỗi lấy /api/admin/statistics:", err.message);
      return null;
    });

  // 2. Fetch gói đăng ký & doanh thu
  const subStatsPromise = fetch(`${API_URL}/api/admin/subscriptions/stats${daysParam}`, fetchOptions)
    .then(async (res) => (res.ok ? await res.json() : null))
    .catch((err) => {
      console.warn("Lỗi lấy /api/admin/subscriptions/stats:", err.message);
      return null;
    });

  // 3. Fetch danh sách gói VIP
  const plansPromise = fetch(`${API_URL}/api/admin/vip-plans`, fetchOptions)
    .then(async (res) => (res.ok ? await res.json() : []))
    .catch((err) => {
      console.warn("Lỗi lấy /api/admin/vip-plans:", err.message);
      return [];
    });

  // 4. Fetch danh sách users để lấy danh sách mới đăng ký
  const usersPromise = fetch(`${API_URL}/api/admin/users`, fetchOptions)
    .then(async (res) => (res.ok ? await res.json() : []))
    .catch((err) => {
      console.warn("Lỗi lấy /api/admin/users:", err.message);
      return [];
    });

  // 5. Fetch subscriptions gần nhất (để biết gói của từng user nếu có)
  const subsPromise = fetch(`${API_URL}/api/admin/subscriptions`, fetchOptions)
    .then(async (res) => (res.ok ? await res.json() : []))
    .catch((err) => {
      console.warn("Lỗi lấy /api/admin/subscriptions:", err.message);
      return [];
    });

  // 6. Fetch danh sách bài viết nóng có lượng bình luận độc hại cao (Top 3)
  const toxicPostsPromise = fetch(`${API_URL}/api/admin/toxic-posts-alerts?limit=3`, fetchOptions)
    .then(async (res) => (res.ok ? await res.json() : []))
    .catch((err) => {
      console.warn("Lỗi lấy /api/admin/toxic-posts-alerts:", err.message);
      return [];
    });

  const [stats, subStats, vipPlans, users, subscriptions, toxicPosts] = await Promise.all([
    statsPromise,
    subStatsPromise,
    plansPromise,
    usersPromise,
    subsPromise,
    toxicPostsPromise,
  ]);

  // Nếu cả 2 API thống kê chính đều null -> có thể backend chưa bật hoặc mất kết nối
  const isBackendConnected = stats !== null || subStats !== null || users.length > 0;

  // Tính toán chỉ số tổng hợp (100% thực tế từ DB)
  const totalUsers = stats?.totalUsers ?? (users.length > 0 ? users.length : 0);
  const activeSubs = subStats?.activeSubscriptions ?? 0;
  const totalRevenue = subStats?.totalRevenue ?? 0;
  const totalAnalysis = (stats?.totalCommentsAnalyzed || stats?.totalPostsAnalyzed) ?? 0;

  // Xử lý danh sách user mới nhất
  let recentUsers = [];
  if (Array.isArray(users) && users.length > 0) {
    // Sắp xếp user mới nhất theo createdAt
    const sortedUsers = [...users].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    recentUsers = sortedUsers.slice(0, 5).map((u) => {
      // Tìm xem user này có đăng ký gói nào không
      const userSub = Array.isArray(subscriptions)
        ? subscriptions.find((s) => s.userId === u.id || s.username === u.username)
        : null;

      const planLabel = userSub
        ? userSub.planCode?.replace(/^VIP_/, "").replace(/_DAYS$/, "D") || "PRO"
        : (u.role === "ADMIN" ? "ADMIN" : "FREE");

      return {
        id: u.id,
        name: u.name || u.username || `User #${u.id}`,
        threads: u.username ? `@${u.username}` : (u.threadsUserId ? `@${u.threadsUserId}` : `@user_${u.id}`),
        plan: planLabel,
        time: formatRelativeTime(u.createdAt || u.lastLoginAt),
      };
    });
  } else {
    // Fallback nếu chưa có user
    recentUsers = [
      { id: 'U01', name: 'Hoàng Nguyễn', threads: '@hoang_tech', plan: 'PRO', time: 'Vừa xong' },
      { id: 'U02', name: 'Thuỷ Trần', threads: '@thuy_mkt', plan: 'ENTERPRISE', time: '15p trước' },
      { id: 'U03', name: 'Minh Quân', threads: '@quan_cr', plan: 'FREE', time: '1h trước' },
    ];
  }

  // Xử lý phân bổ gói hội viên
  const defaultColors = ['#908fa0', '#c0c1ff', '#4edea3', '#f59e0b', '#ec4899'];
  let planDistribution = [];

  if (Array.isArray(vipPlans) && vipPlans.length > 0) {
    // Tính tổng số lượng subscribers để làm thanh %
    const totalSubscribedUsers = vipPlans.reduce((sum, p) => sum + (Number(p.activeSubscribers) || 0), 0);
    const freeUsers = Math.max(0, totalUsers - totalSubscribedUsers);

    planDistribution = [
      {
        name: 'Gói Free (Dùng thử)',
        users: freeUsers,
        color: '#908fa0',
      },
      ...vipPlans.map((p, idx) => ({
        name: p.planName || p.planCode,
        users: Number(p.activeSubscribers) || 0,
        color: defaultColors[(idx + 1) % defaultColors.length],
      })),
    ];
  } else {
    // Fallback mặc định
    planDistribution = [
      { name: 'Gói Free (Dùng thử)', users: 1425, color: '#908fa0' },
      { name: 'Gói Pro (Cá nhân)', users: 1180, color: '#c0c1ff' },
      { name: 'Gói Enterprise', users: 240, color: '#4edea3' },
    ];
  }

  const totalComments = Number(stats?.totalCommentsAnalyzed ?? 0);
  const toxicCount = Number(stats?.toxicCount ?? 0);
  const nonToxicCount = Number(stats?.nonToxicCount ?? 0);
  const cleanCount = Number(stats?.cleanCount ?? 0);
  const offensiveCount = Number(stats?.offensiveCount ?? 0);
  const hateCount = Number(stats?.hateCount ?? 0);
  const positiveCount = Number(stats?.positiveCount ?? 0);
  const neutralCount = Number(stats?.neutralCount ?? 0);
  const negativeCount = Number(stats?.negativeCount ?? 0);
  const totalPosts = Number(stats?.totalPostsAnalyzed ?? 0);

  const sentimentStats = {
    totalComments,
    totalPosts,
    toxic: toxicCount,
    nonToxic: nonToxicCount,
    clean: cleanCount,
    offensive: offensiveCount,
    hate: hateCount,
    positive: positiveCount,
    neutral: neutralCount,
    negative: negativeCount,
    safePercentage: totalComments > 0 ? Math.round((nonToxicCount / totalComments) * 100) : 88,
  };

  const usersGrowthRate = (stats?.usersGrowthRate !== undefined && stats?.usersGrowthRate !== null)
    ? Number(stats.usersGrowthRate)
    : null;
  const commentsGrowthRate = (stats?.commentsGrowthRate !== undefined && stats?.commentsGrowthRate !== null)
    ? Number(stats.commentsGrowthRate)
    : null;
  const revenueGrowthRate = (subStats?.revenueGrowthRate !== undefined && subStats?.revenueGrowthRate !== null)
    ? Number(subStats.revenueGrowthRate)
    : null;
  const subscriptionsGrowthRate = (subStats?.subscriptionsGrowthRate !== undefined && subStats?.subscriptionsGrowthRate !== null)
    ? Number(subStats.subscriptionsGrowthRate)
    : null;

  const newUsersCount = (stats?.newUsersCount !== undefined && stats?.newUsersCount !== null)
    ? Number(stats.newUsersCount)
    : 0;

  return {
    isBackendConnected,
    rawStats: stats,
    rawSubStats: subStats,
    totalUsers,
    newUsersCount,
    activeSubscriptions: activeSubs,
    totalRevenue,
    totalCommentsAnalyzed: totalAnalysis,
    growthRates: {
      users: usersGrowthRate,
      comments: commentsGrowthRate,
      revenue: revenueGrowthRate,
      subscriptions: subscriptionsGrowthRate,
    },
    recentUsers,
    planDistribution,
    planCount: Array.isArray(vipPlans) && vipPlans.length > 0 ? vipPlans.length : 3,
    sentimentStats,
    toxicPosts: Array.isArray(toxicPosts) ? toxicPosts : [],
  };
};
