import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowLeft, 
  Search, 
  Lock, 
  Unlock, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Info,
  RefreshCw,
  Filter,
  Crown,
  Calendar,
  RotateCcw,
  ShieldOff,
  Sparkles,
  Activity,
  FileText,
  CreditCard,
  History,
  ExternalLink,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers, getUserActivity, lockUser, unlockUser } from '../services/adminUserService';
import { getUserSubscriptions, getVipPlans, manualGrantSubscription, revokeUserVip } from '../services/adminSubscriptionService';

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, BLOCKED
  const [vipFilter, setVipFilter] = useState('ALL'); // ALL, VIP, FREE, or specific planCode
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, 7_DAYS, 30_DAYS
  const [sortOrder, setSortOrder] = useState('NEWEST'); // NEWEST, OLDEST

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State for Lock User
  const [lockModalUser, setLockModalUser] = useState(null);
  const [lockDuration, setLockDuration] = useState('1_DAY');
  const [lockReason, setLockReason] = useState('');

  // Modal State for User Details (Drill-down)
  const [detailModalUser, setDetailModalUser] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // overview, posts, vip, logs
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState(null);

  // Modal State for Grant VIP
  const [grantVipModalUser, setGrantVipModalUser] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customDurationDays, setCustomDurationDays] = useState('');

  // Custom Confirm Popup & Toast Notification (replace browser alert/confirm)
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'UNLOCK' | 'REVOKE_VIP', user }
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchUsersList = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, subsData, plansData] = await Promise.all([
        getAdminUsers().catch(err => {
          console.warn("Lỗi getAdminUsers:", err.message);
          return [];
        }),
        getUserSubscriptions().catch(() => []),
        getVipPlans().catch(() => [])
      ]);

      setAvailablePlans(Array.isArray(plansData) ? plansData : []);

      // Ghép thông tin gói VIP đang hoạt động vào từng user
      const mappedUsers = (Array.isArray(usersData) ? usersData : []).map(u => {
        const userSub = Array.isArray(subsData) 
          ? subsData.find(s => (s.userId === u.id || s.username === u.username) && s.status === 'ACTIVE')
          : null;

        const isVip = Boolean(userSub && userSub.status === 'ACTIVE');
        const vipPlanName = isVip ? (userSub.planName || userSub.planCode) : 'Gói Free';
        const vipPlanCode = isVip ? userSub.planCode : 'FREE';

        return {
          ...u,
          isVip,
          vipPlanName,
          vipPlanCode,
          vipDaysRemaining: userSub?.daysRemaining ?? null,
          vipEndAt: userSub?.endAt ?? null
        };
      });

      setUsers(mappedUsers);
      setDetailModalUser(prev => (prev ? mappedUsers.find(mu => mu.id === prev.id) || null : null));
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleOpenLockModal = (user) => {
    setLockModalUser(user);
    setLockDuration('1_DAY');
    setLockReason('');
  };

  const handleConfirmLock = async () => {
    if (!lockModalUser) return;
    const targetId = lockModalUser.id;
    const targetName = lockModalUser.username || lockModalUser.name || `#${targetId}`;
    setActionLoadingId(targetId);
    try {
      await lockUser(targetId, lockDuration, lockReason);
      setLockModalUser(null);
      await fetchUsersList();
      if (detailModalUser?.id === targetId) {
        fetchUserDrilldown(targetId);
      }
      showToast('success', `Đã khóa tài khoản @${targetName}.`);
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi khóa tài khoản');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlock = (user) => {
    if (!user) return;
    setConfirmDialog({ type: 'UNLOCK', user });
  };

  const handleOpenGrantVipModal = (user) => {
    const activePlans = availablePlans.filter(p => p.isActive !== false);
    const matchedPlan = user.isVip
      ? activePlans.find(p => p.planCode === user.vipPlanCode)
      : null;
    const defaultPlan = matchedPlan || activePlans[0] || availablePlans[0];

    setGrantVipModalUser(user);
    setSelectedPlanId(defaultPlan ? String(defaultPlan.id) : '');
    setCustomDurationDays('');
  };

  const fetchUserDrilldown = async (userId) => {
    setDrilldownLoading(true);
    setDrilldownError(null);
    try {
      const data = await getUserActivity(userId);
      setDrilldownData(data);
    } catch (err) {
      setDrilldownError(err.message || 'Không thể tải dữ liệu hoạt động chi tiết.');
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleOpenDetailModal = (user) => {
    setDetailModalUser(user);
    setDetailTab('overview');
    setDrilldownData(null);
    setDrilldownError(null);
    fetchUserDrilldown(user.id);
  };

  const handleConfirmGrantVip = async () => {
    if (!grantVipModalUser || !selectedPlanId) return;

    let customDays = null;
    if (customDurationDays.trim() !== '') {
      const parsed = Number(customDurationDays.trim());
      if (!Number.isInteger(parsed) || parsed <= 0) {
        showToast('error', 'Số ngày hiệu lực tùy chỉnh phải là số nguyên dương.');
        return;
      }
      customDays = parsed;
    }

    const targetId = grantVipModalUser.id;
    const targetName = grantVipModalUser.username || grantVipModalUser.name || `#${targetId}`;
    setActionLoadingId(targetId);
    try {
      await manualGrantSubscription({
        userId: targetId,
        vipPlanId: Number(selectedPlanId),
        customDurationDays: customDays,
        username: grantVipModalUser.username
      });
      setGrantVipModalUser(null);
      await fetchUsersList();
      if (detailModalUser?.id === targetId) {
        fetchUserDrilldown(targetId);
      }
      showToast('success', `Đã cấp quyền VIP cho @${targetName}.`);
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cấp quyền VIP');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeVip = (user) => {
    if (!user) return;
    setConfirmDialog({ type: 'REVOKE_VIP', user });
  };

  const handleExecuteConfirmDialog = async () => {
    if (!confirmDialog?.user) return;
    const { type, user } = confirmDialog;
    const targetName = user.username || user.name || `#${user.id}`;

    setActionLoadingId(user.id);
    try {
      if (type === 'UNLOCK') {
        await unlockUser(user.id);
        showToast('success', `Đã mở khóa tài khoản @${targetName}.`);
      } else if (type === 'REVOKE_VIP') {
        await revokeUserVip(user.id);
        showToast('success', `Đã thu hồi quyền VIP của @${targetName}.`);
      }
      setConfirmDialog(null);
      await fetchUsersList();
      if (detailModalUser?.id === user.id) {
        fetchUserDrilldown(user.id);
      }
    } catch (err) {
      showToast('error', err.message || 'Thao tác thất bại, vui lòng thử lại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Chưa có';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const isWithinDays = (dateStr, days) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= days && diffDays >= 0;
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || vipFilter !== 'ALL' || dateFilter !== 'ALL' || sortOrder !== 'NEWEST';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setVipFilter('ALL');
    setDateFilter('ALL');
    setSortOrder('NEWEST');
    setCurrentPage(1);
  };

  // Logic lọc và sắp xếp người dùng
  const filteredUsers = users.filter((u) => {
    // 1. Text search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const match = (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.threadsUserId && u.threadsUserId.toLowerCase().includes(q)) ||
        (u.vipPlanName && u.vipPlanName.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 2. Status filter
    if (statusFilter !== 'ALL' && u.status !== statusFilter) {
      return false;
    }

    // 3. VIP filter
    if (vipFilter === 'VIP' && !u.isVip) {
      return false;
    }
    if (vipFilter === 'FREE' && u.isVip) {
      return false;
    }
    if (vipFilter !== 'ALL' && vipFilter !== 'VIP' && vipFilter !== 'FREE' && u.vipPlanCode !== vipFilter) {
      return false;
    }

    // 4. Date filter
    if (dateFilter === 'TODAY' && !isToday(u.createdAt)) {
      return false;
    }
    if (dateFilter === '7_DAYS' && !isWithinDays(u.createdAt, 7)) {
      return false;
    }
    if (dateFilter === '30_DAYS' && !isWithinDays(u.createdAt, 30)) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
  });

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (safeCurrentPage > 3) pages.push('...');
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safeCurrentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const handleExportCsv = () => {
    if (!filteredUsers.length) {
      showToast('error', 'Không có dữ liệu người dùng để xuất.');
      return;
    }

    const escapeCsv = (value) => {
      const str = value === null || value === undefined ? '' : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'ID',
      'Threads User ID',
      'Tên hiển thị',
      'Username',
      'Vai trò',
      'Trạng thái',
      'Gói VIP',
      'Số ngày VIP còn lại',
      'Hết hạn VIP',
      'Số bài đã phân tích',
      'Hạn khóa',
      'Lý do khóa',
      'Ngày tham gia',
      'Đăng nhập lần cuối'
    ];

    const rows = filteredUsers.map((u) => [
      u.id,
      u.threadsUserId ? `="${String(u.threadsUserId).replace(/"/g, '')}"` : '',
      (u.name && u.name.trim()) ? u.name : (u.username || 'Chưa đặt tên'),
      u.username || '',
      u.role || 'USER',
      u.status === 'BLOCKED' ? 'Đang bị khóa' : 'Hoạt động',
      u.vipPlanName || 'Gói Free',
      u.isVip && u.vipDaysRemaining !== null ? u.vipDaysRemaining : '',
      u.isVip && u.vipEndAt ? formatDateTime(u.vipEndAt) : '',
      u.postsAnalyzedCount ?? 0,
      u.status === 'BLOCKED' ? (u.blockedUntil ? formatDateTime(u.blockedUntil) : 'Vĩnh viễn') : '',
      u.status === 'BLOCKED' ? (u.blockReason || '') : '',
      u.createdAt ? formatDateTime(u.createdAt) : '',
      u.lastLoginAt ? formatDateTime(u.lastLoginAt) : ''
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users_export_${stamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', `Đã xuất ${filteredUsers.length} người dùng ra file CSV.`);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#13131f] text-[#f1f5f9] font-['Inter'] flex flex-col text-xs select-none">
      {/* Top Header */}
      <div className="bg-[#0d0d14]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="p-1 rounded bg-[#1e1e35] text-[#c0c1ff] hover:bg-[#282a30] transition"
            title="Quay lại Dashboard"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-[12px] text-white">
                Quản lý Người dùng
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-['JetBrains_Mono'] bg-[#4cd7f6]/20 text-[#4cd7f6] border border-[#4cd7f6]/30">
                {users.length} Users
              </span>
            </div>
            <p className="text-[9px] text-[#94a3b8] leading-none">Dữ liệu tài khoản thực tế từ PostgreSQL</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredUsers.length === 0}
            className="px-2 py-1.5 rounded-lg bg-[#4edea3]/15 hover:bg-[#4edea3]/25 text-[#4edea3] border border-[#4edea3]/30 transition flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Xuất danh sách người dùng đang lọc ra file CSV (Excel)"
          >
            <Download size={12} />
            <span className="text-[10px] font-medium">Xuất CSV</span>
          </button>

          <button
            onClick={fetchUsersList}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[#1e1e35] text-[#94a3b8] hover:text-white hover:bg-[#282a30] transition flex items-center space-x-1"
            title="Tải lại danh sách"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-[#4cd7f6]' : ''} />
            <span className="text-[10px]">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-8 max-w-4xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm theo tên, @username, Threads ID, tên gói VIP..."
            className="w-full h-8 pl-8 pr-3 bg-[#1a1a2e] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#4cd7f6] transition"
          />
        </div>

        {/* Thanh Bộ Lọc Nâng Cao */}
        <div className="bg-[#1a1a2e]/90 border border-white/10 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#94a3b8] flex items-center space-x-1 mr-1">
              <Filter size={11} />
              <span>Bộ lọc:</span>
            </span>

            {/* Lọc Trạng Thái */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#4cd7f6]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">🟢 Đang hoạt động</option>
              <option value="BLOCKED">🔴 Đang bị khóa</option>
            </select>

            {/* Lọc Gói VIP */}
            <select
              value={vipFilter}
              onChange={(e) => { setVipFilter(e.target.value); setCurrentPage(1); }}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">Tất cả gói</option>
              <option value="VIP">👑 Có VIP (Active)</option>
              <option value="FREE">Gói Free (Dùng thử)</option>
              {availablePlans.map(p => (
                <option key={p.id || p.planCode} value={p.planCode}>
                  {p.planName || p.planCode}
                </option>
              ))}
            </select>

            {/* Lọc Ngày Tham Gia */}
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#4edea3]"
            >
              <option value="ALL">Mọi ngày tham gia</option>
              <option value="TODAY">Tham gia hôm nay</option>
              <option value="7_DAYS">Trong 7 ngày qua</option>
              <option value="30_DAYS">Trong 30 ngày qua</option>
            </select>

            {/* Sắp Xếp */}
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#c0c1ff]"
            >
              <option value="NEWEST">Mới tham gia nhất</option>
              <option value="OLDEST">Tham gia lâu nhất</option>
            </select>
          </div>

          {/* Reset button & đếm kết quả */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-['JetBrains_Mono'] text-[#94a3b8]">
              {filteredUsers.length} / {users.length} user
            </span>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#4cd7f6] hover:text-white border border-white/10 transition text-[10px] flex items-center space-x-1"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw size={10} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 p-2.5 rounded-lg flex items-center space-x-2 text-[#ffb4ab] text-[11px]">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 text-[#94a3b8]">
            <RefreshCw size={20} className="animate-spin text-[#4cd7f6]" />
            <span className="text-[11px]">Đang tải danh sách người dùng từ database...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredUsers.length === 0 && (
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-xl p-8 text-center text-[#94a3b8]">
            <Users size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-[12px] font-medium text-white/80">Không tìm thấy người dùng nào</p>
            <p className="text-[10px] mt-0.5">Thử nới lỏng từ khóa hoặc bộ lọc tìm kiếm.</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1 bg-[#4cd7f6]/20 hover:bg-[#4cd7f6]/30 text-[#4cd7f6] border border-[#4cd7f6]/30 rounded-lg text-xs font-medium transition"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        )}

        {/* User List */}
        {!loading && filteredUsers.length > 0 && (
          <div className="space-y-1.5">
            {paginatedUsers.map((u) => {
              const isBlocked = u.status === 'BLOCKED';
              const isLoadingAction = actionLoadingId === u.id;

              return (
                <div 
                  key={u.id}
                  className={`bg-[#1a1a2e] border ${isBlocked ? 'border-[#93000a]/40 bg-[#1f1722]' : 'border-white/10'} rounded-lg p-2.5 flex items-center justify-between hover:border-white/20 transition`}
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {u.profilePictureUrl ? (
                        <img 
                          src={u.profilePictureUrl} 
                          alt={u.name || u.username} 
                          className="w-6 h-6 rounded-full object-cover border border-white/20"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#252542] flex items-center justify-center text-[10px] text-[#c0c1ff] font-bold">
                          {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <span className="font-semibold text-[12px] text-white truncate max-w-[150px]">
                        {u.name || u.username || 'Người dùng Threads'}
                      </span>

                      {/* Badge Vai Trò */}
                      <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-semibold ${
                        u.role === 'ADMIN' ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30' :
                        'bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30'
                      }`}>
                        {u.role || 'USER'}
                      </span>

                      {/* Badge Tên Gói VIP */}
                      {u.isVip ? (
                        <span className="text-[9px] font-['JetBrains_Mono'] px-1.5 py-0.5 rounded font-semibold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 flex items-center space-x-0.5 shadow-xs">
                          <span>👑</span>
                          <span>{u.vipPlanName}</span>
                        </span>
                      ) : (
                        <span className="text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded text-[#94a3b8] bg-white/5 border border-white/10">
                          {u.vipPlanName || 'Free'}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[#4cd7f6] font-['JetBrains_Mono'] truncate">
                      @{u.username || u.threadsUserId}
                    </div>

                    <div className="text-[9px] text-[#94a3b8] flex flex-wrap items-center gap-1.5">
                      <span>
                        Trạng thái:{' '}
                        {isBlocked ? (
                          <span className="text-[#ffb4ab] font-medium">Đang bị khóa</span>
                        ) : (
                          <span className="text-[#4edea3] font-medium">Hoạt động</span>
                        )}
                      </span>

                      {isBlocked && (
                        <span className="text-[#ffb4ab]/80 font-['JetBrains_Mono']">
                          • {u.blockedUntil ? `Hết hạn: ${formatDateTime(u.blockedUntil)}` : 'Khóa vĩnh viễn'}
                        </span>
                      )}

                      <span>
                        • Tham gia: {formatDateTime(u.createdAt)}
                      </span>

                      <span>
                        • Đăng nhập: {formatDateTime(u.lastLoginAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-1 shrink-0">
                    <button 
                      onClick={() => handleOpenDetailModal(u)}
                      className="px-2.5 py-1 bg-[#282a30] hover:bg-[#33343b] text-[#f1f5f9] rounded text-[10px] transition font-medium flex items-center justify-center space-x-1"
                    >
                      <Info size={11} />
                      <span>Chi tiết</span>
                    </button>

                    <button
                      onClick={() => handleOpenGrantVipModal(u)}
                      disabled={isLoadingAction}
                      className="px-2.5 py-1 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#fbbf24] border border-[#f59e0b]/30 rounded text-[10px] transition font-medium flex items-center justify-center space-x-1 disabled:opacity-50"
                      title={u.isVip ? 'Đổi gói hoặc gia hạn VIP' : 'Cấp VIP trực tiếp'}
                    >
                      <Crown size={11} />
                      <span>{u.isVip ? 'Đổi VIP' : 'Cấp VIP'}</span>
                    </button>

                    {u.isVip && (
                      <button
                        onClick={() => handleRevokeVip(u)}
                        disabled={isLoadingAction}
                        className="px-2.5 py-1 bg-[#fb7185]/15 hover:bg-[#fb7185]/25 text-[#fda4af] border border-[#fb7185]/25 rounded text-[10px] transition font-medium flex items-center justify-center space-x-1 disabled:opacity-50"
                        title="Thu hồi quyền VIP ngay lập tức"
                      >
                        <ShieldOff size={11} />
                        <span>{isLoadingAction ? '...' : 'Hủy VIP'}</span>
                      </button>
                    )}

                    {isBlocked ? (
                      <button 
                        onClick={() => handleUnlock(u)}
                        disabled={isLoadingAction}
                        className="px-2.5 py-1 bg-[#4edea3]/20 hover:bg-[#4edea3]/30 text-[#4edea3] border border-[#4edea3]/30 rounded text-[10px] transition font-medium flex items-center justify-center space-x-1 disabled:opacity-50"
                      >
                        <Unlock size={11} />
                        <span>{isLoadingAction ? '...' : 'Mở khóa'}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleOpenLockModal(u)}
                        disabled={isLoadingAction}
                        className="px-2.5 py-1 bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#ffb4ab]/20 rounded text-[10px] transition font-medium flex items-center justify-center space-x-1 disabled:opacity-50"
                      >
                        <Lock size={11} />
                        <span>{isLoadingAction ? '...' : 'Khóa'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thanh phân trang */}
            <div className="bg-[#1a1a2e]/90 border border-white/10 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] mt-2">
              <div className="flex items-center space-x-2 text-[#94a3b8]">
                <span className="font-['JetBrains_Mono']">
                  Hiển thị <span className="text-white font-semibold">{startIndex + 1}–{Math.min(startIndex + pageSize, filteredUsers.length)}</span> / {filteredUsers.length} user
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#121221] border border-white/10 text-white rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-[#4cd7f6]"
                  title="Số user mỗi trang"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size} / trang</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1 rounded bg-[#121221] border border-white/10 text-[#cbd5e1] hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang trước"
                >
                  <ChevronLeft size={13} />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`dots-${idx}`} className="px-1.5 text-[#64748b] font-['JetBrains_Mono']">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[24px] h-6 px-1.5 rounded font-['JetBrains_Mono'] text-[10px] border transition ${
                        safeCurrentPage === page
                          ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] border-[#4cd7f6]/50 font-bold'
                          : 'bg-[#121221] text-[#94a3b8] border-white/10 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1 rounded bg-[#121221] border border-white/10 text-[#cbd5e1] hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang sau"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Khóa Tài Khoản */}
      {lockModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#181829] border border-white/10 rounded-xl w-full max-w-sm p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center space-x-2 text-[#ffb4ab]">
                <Lock size={16} />
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white">Khóa Tài khoản</span>
              </div>
              <button 
                onClick={() => setLockModalUser(null)}
                className="text-[#94a3b8] hover:text-white transition p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div className="text-[11px] text-[#cbd5e1] space-y-1">
              <p>Khóa tài khoản: <strong className="text-white">{lockModalUser.name || lockModalUser.username}</strong> (@{lockModalUser.username})</p>
              <p className="text-[#94a3b8] text-[10px]">Người dùng này sẽ không thể đăng nhập hoặc phân tích comment khi bị khóa.</p>
            </div>

            {/* Thời hạn khóa */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#c0c1ff] block">Thời hạn khóa:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: '1_DAY', label: '1 Ngày', desc: 'Mở sau 24h' },
                  { id: '7_DAYS', label: '7 Ngày', desc: 'Mở sau 1 tuần' },
                  { id: '30_DAYS', label: '30 Ngày', desc: 'Mở sau 1 tháng' },
                  { id: 'PERMANENT', label: 'Đến khi mở lại', desc: 'Khóa vĩnh viễn' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLockDuration(opt.id)}
                    className={`p-2 rounded-lg border text-left transition ${
                      lockDuration === opt.id 
                        ? 'bg-[#c0c1ff]/20 border-[#c0c1ff] text-white' 
                        : 'bg-[#121221] border-white/10 text-[#94a3b8] hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">{opt.label}</div>
                    <div className="text-[9px] opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lý do khóa */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#c0c1ff] block">Lý do khóa:</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Ví dụ: Vi phạm quy chuẩn bình luận, spam..."
                className="w-full h-8 px-2.5 bg-[#121221] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#ffb4ab]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setLockModalUser(null)}
                className="px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#33343b] text-[#cbd5e1] text-[11px] font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmLock}
                disabled={actionLoadingId !== null}
                className="px-3 py-1.5 rounded-lg bg-[#93000a] hover:bg-[#b31420] text-white text-[11px] font-semibold transition disabled:opacity-50 flex items-center space-x-1"
              >
                <Lock size={12} />
                <span>{actionLoadingId ? 'Đang xử lý...' : 'Xác nhận khóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Sâu Chi Tiết Hoạt Động User (Drill-down) */}
      {detailModalUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#181829] border border-white/10 rounded-xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#141424] shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                {detailModalUser.profilePictureUrl ? (
                  <img src={detailModalUser.profilePictureUrl} alt="" className="w-9 h-9 rounded-full border border-white/20 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#252542] flex items-center justify-center text-sm font-bold text-[#c0c1ff] shrink-0">
                    {(detailModalUser.name || 'U').charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white truncate">
                      {detailModalUser.name || 'Chưa đặt tên'}
                    </h4>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      detailModalUser.status === 'BLOCKED'
                        ? 'bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/20'
                        : 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/20'
                    }`}>
                      {detailModalUser.status}
                    </span>
                    {detailModalUser.isVip && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30">
                        👑 {detailModalUser.vipPlanName}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#4cd7f6] font-['JetBrains_Mono'] truncate">
                    @{detailModalUser.username} • ID #{detailModalUser.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchUserDrilldown(detailModalUser.id)}
                  disabled={drilldownLoading}
                  className="text-[#94a3b8] hover:text-white transition p-1.5 rounded hover:bg-white/5 disabled:opacity-50"
                  title="Tải lại dữ liệu hoạt động"
                >
                  <RefreshCw size={14} className={drilldownLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  type="button"
                  onClick={() => setDetailModalUser(null)}
                  className="text-[#94a3b8] hover:text-white transition p-1.5 rounded hover:bg-white/5"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Drill-down Tabs */}
            <div className="grid grid-cols-4 border-b border-white/10 bg-[#121221] text-[10px] font-medium shrink-0">
              {[
                { id: 'overview', label: 'Tổng quan', icon: Gauge },
                { id: 'posts', label: `Bài viết${drilldownData ? ` (${drilldownData.recentPosts?.length || 0})` : ''}`, icon: FileText },
                { id: 'vip', label: `VIP & GD${drilldownData ? ` (${(drilldownData.subscriptions?.length || 0) + (drilldownData.payments?.length || 0)})` : ''}`, icon: CreditCard },
                { id: 'logs', label: `Nhật ký${drilldownData ? ` (${drilldownData.auditLogs?.length || 0})` : ''}`, icon: History }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`py-2 px-1.5 flex items-center justify-center space-x-1 border-b-2 transition ${
                      active
                        ? 'border-[#4cd7f6] text-[#4cd7f6] bg-[#181829]'
                        : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={11} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-[11px]">
              {drilldownError && (
                <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] px-3 py-2 rounded-lg text-[10px] flex items-center space-x-1.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>{drilldownError}</span>
                </div>
              )}

              {detailTab === 'overview' && (
                <div className="space-y-3">
                  {/* Quota hôm nay */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] flex items-center space-x-1">
                      <Activity size={11} className="text-[#4cd7f6]" />
                      <span>Hạn mức sử dụng hôm nay (Quota)</span>
                    </div>
                    {drilldownLoading && !drilldownData ? (
                      <div className="bg-[#121221] border border-white/5 rounded-lg p-3 text-center text-[#94a3b8] text-[10px]">
                        Đang tải số liệu hoạt động...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#121221] border border-white/10 rounded-lg p-2.5">
                          <div className="text-[9px] text-[#94a3b8]">Phân tích bài viết hôm nay</div>
                          <div className="text-sm font-bold text-white mt-0.5 font-['JetBrains_Mono']">
                            {drilldownData?.quota?.todayAnalysisCount ?? 0}
                            <span className="text-[10px] font-normal text-[#94a3b8]">
                              {drilldownData?.quota?.unlimited ? ' / ∞ (VIP)' : ` / ${drilldownData?.quota?.dailyAnalyzeLimit ?? 3}`}
                            </span>
                          </div>
                          {!drilldownData?.quota?.unlimited && (
                            <div className="text-[9px] text-[#4cd7f6] mt-0.5">
                              Còn lại: {drilldownData?.quota?.remainingAnalysis ?? 3} lượt
                            </div>
                          )}
                        </div>
                        <div className="bg-[#121221] border border-white/10 rounded-lg p-2.5">
                          <div className="text-[9px] text-[#94a3b8]">Xuất báo cáo hôm nay</div>
                          <div className="text-sm font-bold text-white mt-0.5 font-['JetBrains_Mono']">
                            {drilldownData?.quota?.todayExportCount ?? 0}
                            <span className="text-[10px] font-normal text-[#94a3b8]">
                              {drilldownData?.quota?.unlimited ? ' / ∞ (VIP)' : ` / ${drilldownData?.quota?.dailyExportLimit ?? 3}`}
                            </span>
                          </div>
                          {!drilldownData?.quota?.unlimited && (
                            <div className="text-[9px] text-[#4edea3] mt-0.5">
                              Còn lại: {drilldownData?.quota?.remainingExports ?? 3} lượt
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thống kê tích lũy */}
                  {drilldownData?.quota && (
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="bg-[#121221] border border-white/5 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#94a3b8]">Bài viết</div>
                        <div className="text-xs font-bold text-white font-['JetBrains_Mono'] mt-0.5">
                          {drilldownData.quota.totalPostsCount}
                        </div>
                      </div>
                      <div className="bg-[#121221] border border-white/5 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#94a3b8]">Bình luận</div>
                        <div className="text-xs font-bold text-[#4cd7f6] font-['JetBrains_Mono'] mt-0.5">
                          {drilldownData.quota.totalCommentsAnalyzed}
                        </div>
                      </div>
                      <div className="bg-[#121221] border border-white/5 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#94a3b8]">Độc hại</div>
                        <div className="text-xs font-bold text-[#ffb4ab] font-['JetBrains_Mono'] mt-0.5">
                          {drilldownData.quota.totalToxicComments}
                        </div>
                      </div>
                      <div className="bg-[#121221] border border-white/5 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#94a3b8]">Tổng chi VIP</div>
                        <div className="text-[11px] font-bold text-[#fbbf24] font-['JetBrains_Mono'] mt-0.5">
                          {Number(drilldownData.quota.totalSpentVnd || 0).toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thông tin tài khoản */}
                  <div className="bg-[#121221] rounded-lg p-2.5 space-y-1.5 border border-white/5 font-['JetBrains_Mono'] text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Threads User ID:</span>
                      <span className="text-[#4cd7f6]">{detailModalUser.threadsUserId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Vai trò:</span>
                      <span className="text-white">{detailModalUser.role}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#94a3b8]">Gói VIP hiện tại:</span>
                      <span className={detailModalUser.isVip ? 'text-[#fbbf24] font-bold' : 'text-[#94a3b8]'}>
                        {detailModalUser.vipPlanName}
                        {detailModalUser.isVip && detailModalUser.vipDaysRemaining !== null ? ` (còn ${detailModalUser.vipDaysRemaining} ngày)` : ''}
                      </span>
                    </div>
                    {detailModalUser.status === 'BLOCKED' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#94a3b8]">Hạn khóa:</span>
                          <span className="text-[#ffb4ab]">
                            {detailModalUser.blockedUntil ? formatDateTime(detailModalUser.blockedUntil) : 'Vĩnh viễn'}
                          </span>
                        </div>
                        {detailModalUser.blockReason && (
                          <div className="flex justify-between gap-2">
                            <span className="text-[#94a3b8] shrink-0">Lý do khóa:</span>
                            <span className="text-[#ffb4ab] text-right">{detailModalUser.blockReason}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Ngày tham gia:</span>
                      <span className="text-white">{formatDateTime(detailModalUser.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Đăng nhập lần cuối:</span>
                      <span className="text-white">{formatDateTime(detailModalUser.lastLoginAt)}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'posts' && (
                <div className="space-y-2">
                  {drilldownLoading && !drilldownData ? (
                    <div className="text-center py-6 text-[#94a3b8]">Đang tải danh sách bài viết...</div>
                  ) : !drilldownData?.recentPosts?.length ? (
                    <div className="text-center py-6 text-[#94a3b8] bg-[#121221] rounded-lg border border-white/5">
                      Người dùng này chưa đồng bộ hoặc phân tích bài viết nào.
                    </div>
                  ) : (
                    drilldownData.recentPosts.map((post) => {
                      const toxBadge = post.toxicPercentage >= 35
                        ? 'bg-[#93000a]/30 text-[#ffb4ab] border-[#ffb4ab]/30'
                        : post.toxicPercentage > 0
                          ? 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30'
                          : 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30';
                      return (
                        <div key={post.threadsPostId} className="bg-[#121221] border border-white/10 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11px] text-white line-clamp-2 flex-1">
                              {post.text || <span className="italic text-[#64748b]">(Bài viết không có nội dung chữ)</span>}
                            </p>
                            {post.permalink && (
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#4cd7f6] hover:text-white p-1 shrink-0"
                                title="Mở bài viết trên Threads"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-['JetBrains_Mono']">
                            <div className="flex items-center space-x-1.5">
                              <span className={`px-1.5 py-0.5 rounded border ${post.analyzed ? toxBadge : 'bg-white/5 text-[#94a3b8] border-white/10'}`}>
                                {post.analyzed ? `Toxic ${post.toxicPercentage}% (${post.toxicCount}/${post.analyzedComments})` : 'Chưa phân tích'}
                              </span>
                              {post.analyzed && (
                                <span className="text-[#94a3b8]">
                                  Pos:{post.positiveCount} • Neu:{post.neutralCount} • Neg:{post.negativeCount}
                                </span>
                              )}
                            </div>
                            <span className="text-[#64748b]">
                              {formatDateTime(post.analyzedAt || post.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {detailTab === 'vip' && (
                <div className="space-y-3">
                  {drilldownLoading && !drilldownData ? (
                    <div className="text-center py-6 text-[#94a3b8]">Đang tải lịch sử VIP & thanh toán...</div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                          Lịch sử đăng ký / cấp VIP ({drilldownData?.subscriptions?.length || 0})
                        </div>
                        {!drilldownData?.subscriptions?.length ? (
                          <div className="text-center py-3 text-[#94a3b8] bg-[#121221] rounded-lg border border-white/5 text-[10px]">
                            Chưa có lịch sử gói VIP.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {drilldownData.subscriptions.map((sub) => (
                              <div key={sub.id} className="bg-[#121221] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold text-white truncate">
                                    {sub.planName}
                                  </div>
                                  <div className="text-[9px] text-[#94a3b8] font-['JetBrains_Mono']">
                                    {formatDateTime(sub.startAt)} → {formatDateTime(sub.endAt)}
                                  </div>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                  sub.status === 'ACTIVE'
                                    ? 'bg-[#4edea3]/15 text-[#4edea3]'
                                    : sub.status === 'CANCELLED'
                                      ? 'bg-[#fb7185]/15 text-[#fda4af]'
                                      : 'bg-white/10 text-[#94a3b8]'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                          Giao dịch thanh toán ({drilldownData?.payments?.length || 0})
                        </div>
                        {!drilldownData?.payments?.length ? (
                          <div className="text-center py-3 text-[#94a3b8] bg-[#121221] rounded-lg border border-white/5 text-[10px]">
                            Chưa có giao dịch thanh toán nào.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {drilldownData.payments.map((pay) => (
                              <div key={pay.id} className="bg-[#121221] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[10px] font-['JetBrains_Mono'] text-[#4cd7f6] truncate">
                                    #{pay.orderCode} • {pay.paymentProvider}
                                  </div>
                                  <div className="text-[9px] text-[#94a3b8]">
                                    {formatDateTime(pay.paidAt || pay.createdAt)}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[11px] font-bold text-[#fbbf24] font-['JetBrains_Mono']">
                                    {Number(pay.amount || 0).toLocaleString('vi-VN')} {pay.currency || 'VND'}
                                  </div>
                                  <span className={`text-[9px] font-semibold ${
                                    pay.status === 'SUCCESS' ? 'text-[#4edea3]' : pay.status === 'PENDING' ? 'text-[#fbbf24]' : 'text-[#ffb4ab]'
                                  }`}>
                                    {pay.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {detailTab === 'logs' && (
                <div className="space-y-1.5">
                  {drilldownLoading && !drilldownData ? (
                    <div className="text-center py-6 text-[#94a3b8]">Đang tải nhật ký tác động...</div>
                  ) : !drilldownData?.auditLogs?.length ? (
                    <div className="text-center py-6 text-[#94a3b8] bg-[#121221] rounded-lg border border-white/5">
                      Chưa ghi nhận thao tác quản trị nào lên người dùng này.
                    </div>
                  ) : (
                    drilldownData.auditLogs.map((logItem) => (
                      <div key={logItem.id} className="bg-[#121221] border border-white/10 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-['JetBrains_Mono']">
                          <span className="px-1.5 py-0.5 rounded bg-[#c0c1ff]/15 text-[#c0c1ff] font-bold">
                            {logItem.action}
                          </span>
                          <span className="text-[#64748b]">
                            bởi {logItem.adminUsername} • {formatDateTime(logItem.createdAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#e2e8f0]">{logItem.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer Quick Actions */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-white/10 bg-[#141424] shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenGrantVipModal(detailModalUser)}
                  disabled={actionLoadingId === detailModalUser.id}
                  className="px-2.5 py-1.5 rounded-lg bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#fbbf24] border border-[#f59e0b]/30 text-[10px] font-medium transition flex items-center space-x-1 disabled:opacity-50"
                >
                  <Crown size={11} />
                  <span>{detailModalUser.isVip ? 'Đổi / Gia hạn VIP' : 'Cấp VIP'}</span>
                </button>
                {detailModalUser.isVip && (
                  <button
                    type="button"
                    onClick={() => handleRevokeVip(detailModalUser)}
                    disabled={actionLoadingId === detailModalUser.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#fb7185]/15 hover:bg-[#fb7185]/25 text-[#fda4af] border border-[#fb7185]/30 text-[10px] font-medium transition flex items-center space-x-1 disabled:opacity-50"
                  >
                    <ShieldOff size={11} />
                    <span>{actionLoadingId === detailModalUser.id ? '...' : 'Thu hồi VIP'}</span>
                  </button>
                )}
                {detailModalUser.status === 'BLOCKED' ? (
                  <button
                    type="button"
                    onClick={() => handleUnlock(detailModalUser)}
                    disabled={actionLoadingId === detailModalUser.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#4edea3]/15 hover:bg-[#4edea3]/25 text-[#4edea3] border border-[#4edea3]/30 text-[10px] font-medium transition flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Unlock size={11} />
                    <span>Mở khóa</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenLockModal(detailModalUser)}
                    disabled={actionLoadingId === detailModalUser.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#93000a]/25 hover:bg-[#93000a]/45 text-[#ffb4ab] border border-[#ffb4ab]/25 text-[10px] font-medium transition flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Lock size={11} />
                    <span>Khóa</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailModalUser(null)}
                className="px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#33343b] text-[#cbd5e1] text-[10px] font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant VIP Modal */}
      {grantVipModalUser && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181829] border border-[#f59e0b]/30 rounded-xl w-full max-w-xs p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-1.5 text-[#fbbf24] font-bold text-[13px]">
                <Crown size={15} />
                <span>Cấp / Gia hạn VIP</span>
              </div>
              <button
                onClick={() => setGrantVipModalUser(null)}
                className="text-[#94a3b8] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-[#121221] border border-white/5 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-white">
                    @{grantVipModalUser.username || 'user'}
                  </div>
                  <div className="text-[10px] text-[#94a3b8]">
                    Hiện tại: <span className={grantVipModalUser.isVip ? 'text-[#fbbf24]' : 'text-[#cbd5e1]'}>
                      {grantVipModalUser.vipPlanName}
                    </span>
                  </div>
                </div>
                {grantVipModalUser.isVip && grantVipModalUser.vipDaysRemaining !== null && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30">
                    Còn {grantVipModalUser.vipDaysRemaining} ngày
                  </span>
                )}
              </div>

              <div>
                <label className="text-[10px] text-[#94a3b8] font-medium block mb-1">
                  Chọn gói VIP
                </label>
                {availablePlans.filter(p => p.isActive !== false).length === 0 ? (
                  <div className="text-[10px] text-[#ffb4ab] bg-[#93000a]/20 border border-[#ffb4ab]/20 rounded p-2">
                    Không tìm thấy gói VIP khả dụng.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                    {availablePlans
                      .filter(p => p.isActive !== false)
                      .map((plan) => {
                        const isSelected = String(plan.id) === String(selectedPlanId);
                        const priceText = plan.price && Number(plan.price) > 0
                          ? `${Number(plan.price).toLocaleString('vi-VN')}đ`
                          : 'Miễn phí';
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlanId(String(plan.id))}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#f59e0b]/15 border-[#f59e0b]/50 text-white'
                                : 'bg-[#121221] border-white/10 text-[#cbd5e1] hover:border-white/20'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold flex items-center space-x-1">
                                <Sparkles size={10} className={isSelected ? 'text-[#fbbf24]' : 'text-[#64748b]'} />
                                <span className="truncate">{plan.planName}</span>
                              </div>
                              <div className="text-[9px] text-[#94a3b8]">
                                Mặc định: {plan.durationDays} ngày
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-[#4edea3] shrink-0 ml-2">
                              {priceText}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-[#94a3b8] font-medium block mb-1">
                  Số ngày tùy chỉnh (tùy chọn)
                </label>
                <input
                  type="number"
                  min="1"
                  value={customDurationDays}
                  onChange={(e) => setCustomDurationDays(e.target.value)}
                  placeholder="Để trống = dùng mặc định của gói"
                  className="w-full px-2.5 py-1.5 bg-[#121221] border border-white/10 rounded-lg text-white text-[11px] focus:outline-none focus:border-[#f59e0b]/50"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCustomDurationDays(prev => (prev === String(d) ? '' : String(d)))}
                      className={`px-2 py-0.5 rounded text-[9px] border transition ${
                        customDurationDays === String(d)
                          ? 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/40'
                          : 'bg-[#121221] text-[#94a3b8] border-white/10 hover:text-white'
                      }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setGrantVipModalUser(null)}
                className="px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#33343b] text-[#cbd5e1] text-[11px] font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoadingId === grantVipModalUser.id || !selectedPlanId}
                onClick={handleConfirmGrantVip}
                className="px-3 py-1.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#121221] text-[11px] font-bold transition disabled:opacity-50"
              >
                {actionLoadingId === grantVipModalUser.id ? 'Đang cấp...' : 'Xác nhận cấp VIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Popup */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`bg-[#181829] rounded-xl w-full max-w-xs p-4 shadow-2xl space-y-3 border ${
            confirmDialog.type === 'UNLOCK' ? 'border-[#4edea3]/30' : 'border-[#fb7185]/35'
          }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className={`flex items-center space-x-2 font-bold text-[13px] ${
                confirmDialog.type === 'UNLOCK' ? 'text-[#4edea3]' : 'text-[#fda4af]'
              }`}>
                {confirmDialog.type === 'UNLOCK' ? <Unlock size={15} /> : <ShieldOff size={15} />}
                <span>
                  {confirmDialog.type === 'UNLOCK' ? 'Xác nhận mở khóa' : 'Xác nhận thu hồi VIP'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={actionLoadingId === confirmDialog.user.id}
                className="text-[#94a3b8] hover:text-white transition p-0.5 disabled:opacity-50"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-[#121221] border border-white/5 rounded-lg p-2.5 flex items-center space-x-2.5">
                {confirmDialog.user.profilePictureUrl ? (
                  <img
                    src={confirmDialog.user.profilePictureUrl}
                    alt=""
                    className="w-8 h-8 rounded-full border border-white/15 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#252542] flex items-center justify-center text-xs font-bold text-[#c0c1ff] shrink-0">
                    {(confirmDialog.user.name || confirmDialog.user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate">
                    {confirmDialog.user.name || 'Người dùng'}
                  </div>
                  <div className="text-[10px] text-[#4cd7f6] font-['JetBrains_Mono'] truncate">
                    @{confirmDialog.user.username || confirmDialog.user.id}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
                {confirmDialog.type === 'UNLOCK' ? (
                  <>
                    Bạn có chắc chắn muốn <span className="text-[#4edea3] font-semibold">mở khóa</span> tài khoản này? Người dùng sẽ có thể đăng nhập và sử dụng lại hệ thống ngay lập tức.
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn thu hồi gói <span className="text-[#fbbf24] font-semibold">{confirmDialog.user.vipPlanName}</span> của tài khoản này? Quyền lợi sẽ chuyển về <span className="text-white font-medium">Gói Free</span> ngay lập tức.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={actionLoadingId === confirmDialog.user.id}
                className="px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#33343b] text-[#cbd5e1] text-[11px] font-medium transition disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmDialog}
                disabled={actionLoadingId === confirmDialog.user.id}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 disabled:opacity-50 ${
                  confirmDialog.type === 'UNLOCK'
                    ? 'bg-[#4edea3] hover:bg-[#34d399] text-[#0c1f17]'
                    : 'bg-[#e11d48] hover:bg-[#be123c] text-white'
                }`}
              >
                {confirmDialog.type === 'UNLOCK' ? <Unlock size={12} /> : <ShieldOff size={12} />}
                <span>
                  {actionLoadingId === confirmDialog.user.id
                    ? 'Đang xử lý...'
                    : confirmDialog.type === 'UNLOCK'
                      ? 'Xác nhận mở khóa'
                      : 'Xác nhận thu hồi'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-xs animate-fadeIn">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border shadow-2xl backdrop-blur-md text-[11px] font-medium ${
            toast.type === 'success'
              ? 'bg-[#122620]/95 border-[#4edea3]/40 text-[#4edea3]'
              : 'bg-[#2a1218]/95 border-[#ffb4ab]/40 text-[#ffb4ab]'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={14} className="shrink-0" />
            ) : (
              <AlertTriangle size={14} className="shrink-0" />
            )}
            <span className="flex-1 text-white/95">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white p-0.5 shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
