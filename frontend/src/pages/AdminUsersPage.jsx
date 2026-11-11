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
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers, lockUser, unlockUser } from '../services/adminUserService';
import { getUserSubscriptions, getVipPlans } from '../services/adminSubscriptionService';

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

  // Modal State for Lock User
  const [lockModalUser, setLockModalUser] = useState(null);
  const [lockDuration, setLockDuration] = useState('1_DAY');
  const [lockReason, setLockReason] = useState('');

  // Modal State for User Details
  const [detailModalUser, setDetailModalUser] = useState(null);

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

      // Ghép thông tin gói VIP vào từng user
      const mappedUsers = (Array.isArray(usersData) ? usersData : []).map(u => {
        const userSub = Array.isArray(subsData) 
          ? subsData.find(s => s.userId === u.id || s.username === u.username)
          : null;

        const isVip = userSub && userSub.status === 'ACTIVE';
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
    setActionLoadingId(lockModalUser.id);
    try {
      await lockUser(lockModalUser.id, lockDuration, lockReason);
      setLockModalUser(null);
      await fetchUsersList();
    } catch (err) {
      alert(err.message || 'Lỗi khi khóa tài khoản');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlock = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn mở khóa tài khoản này?')) return;
    setActionLoadingId(userId);
    try {
      await unlockUser(userId);
      await fetchUsersList();
    } catch (err) {
      alert(err.message || 'Lỗi khi mở khóa tài khoản');
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-8 max-w-4xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#4cd7f6]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">🟢 Đang hoạt động</option>
              <option value="BLOCKED">🔴 Đang bị khóa</option>
            </select>

            {/* Lọc Gói VIP */}
            <select
              value={vipFilter}
              onChange={(e) => setVipFilter(e.target.value)}
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
              onChange={(e) => setDateFilter(e.target.value)}
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
              onChange={(e) => setSortOrder(e.target.value)}
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
            {filteredUsers.map((u) => {
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
                      onClick={() => setDetailModalUser(u)}
                      className="px-2.5 py-1 bg-[#282a30] hover:bg-[#33343b] text-[#f1f5f9] rounded text-[10px] transition font-medium flex items-center justify-center space-x-1"
                    >
                      <Info size={11} />
                      <span>Chi tiết</span>
                    </button>

                    {isBlocked ? (
                      <button 
                        onClick={() => handleUnlock(u.id)}
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
          </div>
        )}
      </div>

      {/* Modal Khóa Tài Khoản */}
      {lockModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
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

      {/* Modal Xem Chi Tiết User */}
      {detailModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#181829] border border-white/10 rounded-xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white">Chi tiết Người dùng</span>
              <button 
                onClick={() => setDetailModalUser(null)}
                className="text-[#94a3b8] hover:text-white transition p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center space-x-2.5">
                {detailModalUser.profilePictureUrl ? (
                  <img src={detailModalUser.profilePictureUrl} alt="" className="w-10 h-10 rounded-full border border-white/20" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#252542] flex items-center justify-center text-sm font-bold text-[#c0c1ff]">
                    {(detailModalUser.name || 'U').charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-white">{detailModalUser.name || 'Chưa đặt tên'}</h4>
                  <p className="text-[10px] text-[#4cd7f6] font-['JetBrains_Mono']">@{detailModalUser.username}</p>
                </div>
              </div>

              <div className="bg-[#121221] rounded-lg p-2.5 space-y-1.5 border border-white/5 font-['JetBrains_Mono'] text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">ID Database:</span>
                  <span className="text-white">{detailModalUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Threads User ID:</span>
                  <span className="text-[#4cd7f6]">{detailModalUser.threadsUserId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Vai trò:</span>
                  <span className="text-white">{detailModalUser.role}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8]">Gói VIP:</span>
                  <span className={detailModalUser.isVip ? "text-[#f59e0b] font-bold flex items-center space-x-1" : "text-[#94a3b8]"}>
                    {detailModalUser.isVip && <span>👑</span>}
                    <span>{detailModalUser.vipPlanName}</span>
                  </span>
                </div>
                {detailModalUser.isVip && detailModalUser.vipDaysRemaining !== null && (
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Hạn VIP còn lại:</span>
                    <span className="text-[#4edea3]">{detailModalUser.vipDaysRemaining} ngày</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Trạng thái tài khoản:</span>
                  <span className={detailModalUser.status === 'BLOCKED' ? 'text-[#ffb4ab]' : 'text-[#4edea3]'}>
                    {detailModalUser.status}
                  </span>
                </div>
                {detailModalUser.status === 'BLOCKED' && (
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Hạn khóa:</span>
                    <span className="text-[#ffb4ab]">
                      {detailModalUser.blockedUntil ? formatDateTime(detailModalUser.blockedUntil) : 'Vĩnh viễn'}
                    </span>
                  </div>
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

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDetailModalUser(null)}
                className="px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#33343b] text-[#cbd5e1] text-[11px] font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
