import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  LogOut, 
  ChevronRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminDashboardData, 
  formatCompactNumber, 
  formatCurrency 
} from '../services/adminDashboardService';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    totalCommentsAnalyzed: 0,
    recentUsers: [],
    planDistribution: [],
    planCount: 3,
    isBackendConnected: false
  });

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getAdminDashboardData();
      setDashboardData(data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu Admin Dashboard:", err);
      setError("Không thể tải toàn bộ dữ liệu mới nhất. Đang hiển thị bản lưu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_auth');
    navigate('/admin/login');
  };

  // Tính tổng số user trong phân bổ gói để làm cơ sở tính %
  const totalDistributionUsers = dashboardData.planDistribution.reduce(
    (sum, p) => sum + (Number(p.users) || 0), 
    0
  ) || dashboardData.totalUsers || 1;

  // 4 thẻ chỉ số tóm tắt
  const summaryMetrics = [
    { 
      label: 'Tổng User', 
      value: loading ? '...' : formatCompactNumber(dashboardData.totalUsers), 
      change: '+12%' 
    },
    { 
      label: 'Gói Active', 
      value: loading ? '...' : formatCompactNumber(dashboardData.activeSubscriptions), 
      change: '+8%' 
    },
    { 
      label: 'Doanh thu', 
      value: loading ? '...' : formatCurrency(dashboardData.totalRevenue), 
      change: '+15%' 
    },
    { 
      label: 'Lượt PhoBERT', 
      value: loading ? '...' : formatCompactNumber(dashboardData.totalCommentsAnalyzed), 
      change: '+24%' 
    }
  ];

  return (
    <div className="w-full h-full min-h-screen bg-[#13131f] text-[#f1f5f9] font-['Inter'] flex flex-col text-xs select-none">
      {/* Header Admin */}
      <div className="bg-[#0d0d14]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#7c3aed] to-[#22d3ee] flex items-center justify-center text-xs font-bold shadow-sm">
            🛡️
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-[12px] text-white">
                Admin Dashboard
              </span>
              <span className="px-1 py-0.2 rounded text-[8px] font-['JetBrains_Mono'] bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/30">
                ADMIN
              </span>
            </div>
            <p className="text-[9px] text-[#94a3b8] leading-none">Social Comment Analyzer</p>
          </div>
        </div>

        {/* Nút hành động header */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="flex items-center space-x-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-[#94a3b8] hover:text-white rounded border border-white/10 transition text-[11px] disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-[#4cd7f6]" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] rounded border border-[#ffb4ab]/30 transition text-[11px]"
            title="Đăng xuất"
          >
            <LogOut size={12} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8">
        {/* Banner cảnh báo nếu có lỗi */}
        {error && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 rounded-lg p-2 flex items-center space-x-2 text-[#ffb4ab] text-[11px]">
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button 
              onClick={() => loadData(true)} 
              className="underline hover:text-white font-medium"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Grid 4 chỉ số tóm tắt (2x2) */}
        <div className="grid grid-cols-2 gap-2">
          {summaryMetrics.map((item, idx) => (
            <div 
              key={idx}
              className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between shadow-xs hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between text-[#94a3b8]">
                <span className="text-[10px]">{item.label}</span>
                <span className="text-[9px] font-['JetBrains_Mono'] font-semibold text-[#4edea3]">
                  {item.change}
                </span>
              </div>
              <div className="font-['Plus_Jakarta_Sans'] text-base font-bold text-white mt-1">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* 2 Navigation Cards */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#94a3b8] px-0.5">
            Chức năng quản trị chính
          </div>

          {/* Nav 1: Quản lý người dùng */}
          <button
            onClick={() => navigate('/admin/users')}
            className="w-full bg-[#1a1a2e] hover:bg-[#1e1e35] border border-white/10 hover:border-[#4cd7f6]/50 rounded-lg p-2.5 flex items-center justify-between transition text-left group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4cd7f6]/10 text-[#4cd7f6] flex items-center justify-center border border-[#4cd7f6]/20 shrink-0">
                <Users size={16} />
              </div>
              <div>
                <div className="font-semibold text-[12px] text-[#f1f5f9] group-hover:text-[#4cd7f6] transition">
                  Quản lý Người dùng
                </div>
                <div className="text-[10px] text-[#94a3b8]">
                  {/* Xem danh sách {loading ? '...' : formatCompactNumber(dashboardData.totalUsers)} user & tài khoản Threads */}
                </div>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#94a3b8] group-hover:text-[#4cd7f6] group-hover:translate-x-0.5 transition" />
          </button>

          {/* Nav 2: Quản lý gói đăng ký */}
          <button
            onClick={() => navigate('/admin/subscriptions')}
            className="w-full bg-[#1a1a2e] hover:bg-[#1e1e35] border border-white/10 hover:border-[#c0c1ff]/50 rounded-lg p-2.5 flex items-center justify-between transition text-left group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/10 text-[#c0c1ff] flex items-center justify-center border border-[#c0c1ff]/20 shrink-0">
                <CreditCard size={16} />
              </div>
              <div>
                <div className="font-semibold text-[12px] text-[#f1f5f9] group-hover:text-[#c0c1ff] transition">
                  Quản lý Gói đăng ký
                </div>
                <div className="text-[10px] text-[#94a3b8]">
                  {/* Cấu hình {dashboardData.planCount} gói (Free, VIP 30 ngày, VIP 90 ngày,...) */}
                </div>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#94a3b8] group-hover:text-[#c0c1ff] group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* Bảng mini: User mới nhất */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-semibold text-[11px] text-[#f1f5f9]">User đăng ký mới nhất</span>
            <button 
              onClick={() => navigate('/admin/users')}
              className="text-[10px] text-[#4cd7f6] hover:underline"
            >
              Xem hết →
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {dashboardData.recentUsers.map((u) => (
              <div key={u.id} className="py-1.5 flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-medium text-white">{u.name}</span>
                  <span className="text-[10px] text-[#4cd7f6] font-['JetBrains_Mono'] ml-1.5">
                    {u.threads}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[9px] font-['JetBrains_Mono'] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#c0c1ff]">
                    {u.plan}
                  </span>
                  <span className="text-[9px] text-[#94a3b8]">{u.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tỷ lệ phân bổ gói đăng ký */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-semibold text-[11px] text-[#f1f5f9]">Phân bổ hội viên</span>
            <span className="text-[10px] text-[#4edea3]">
              Tổng: {loading ? '...' : formatCompactNumber(dashboardData.totalUsers)}
            </span>
          </div>
          <div className="space-y-2 text-[10px]">
            {dashboardData.planDistribution.map((p, i) => {
              const percentage = totalDistributionUsers > 0 
                ? Math.min(100, Math.round((p.users / totalDistributionUsers) * 100)) 
                : 0;

              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>{p.name}</span>
                    <span className="font-['JetBrains_Mono'] text-white">
                      {p.users.toLocaleString('vi-VN')} user ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#0d0d14] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: p.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
