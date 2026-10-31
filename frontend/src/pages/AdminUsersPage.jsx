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
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers, lockUser, unlockUser } from '../services/adminUserService';

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
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

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.threadsUserId && u.threadsUserId.toLowerCase().includes(q))
    );
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
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, @username, Threads ID..."
            className="w-full h-8 pl-8 pr-3 bg-[#1a1a2e] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#4cd7f6] transition"
          />
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
            <p className="text-[10px] mt-0.5">Thử tìm kiếm với từ khóa khác hoặc kiểm tra lại kết nối cơ sở dữ liệu.</p>
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
                    <div className="flex items-center space-x-2">
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
                      
                      <span className="font-semibold text-[12px] text-white truncate">
                        {u.name || u.username || 'Người dùng Threads'}
                      </span>

                      <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-semibold ${
                        u.role === 'ADMIN' ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30' :
                        'bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30'
                      }`}>
                        {u.role || 'USER'}
                      </span>
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
                    className={`p-2 rounded-lg border text-left transition flex flex-col ${
                      lockDuration === opt.id 
                        ? 'border-[#4cd7f6] bg-[#4cd7f6]/10 text-white' 
                        : 'border-white/10 bg-[#121221] text-[#94a3b8] hover:border-white/20'
                    }`}
                  >
                    <span className="font-semibold text-[11px]">{opt.label}</span>
                    <span className="text-[9px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lý do khóa */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#c0c1ff] block">Lý do khóa (tùy chọn):</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="VD: Vi phạm chính sách sử dụng, spam..."
                className="w-full h-8 px-2.5 bg-[#121221] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#4cd7f6]"
              />
            </div>

            {/* Buttons */}
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
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Trạng thái:</span>
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
