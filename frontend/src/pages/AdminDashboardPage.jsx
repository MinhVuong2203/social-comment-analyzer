import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  LogOut, 
  ChevronRight,
  Clock,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    navigate('/admin/login');
  };

  const handleUnderDevelopment = (featureName) => {
    setToastMessage(`Tính năng "${featureName}" đang được phát triển.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Mock data tóm tắt
  const summaryMetrics = [
    { label: 'Tổng User', value: '2,845', change: '+12%' },
    { label: 'Gói Active', value: '1,420', change: '+8%' },
    { label: 'Doanh thu', value: '48.5M ₫', change: '+15%' },
    { label: 'Lượt PhoBERT', value: '184.2K', change: '+24%' }
  ];

  // Mock users mới nhất
  const recentUsers = [
    { id: 'U01', name: 'Hoàng Nguyễn', threads: '@hoang_tech', plan: 'PRO', time: 'Vừa xong' },
    { id: 'U02', name: 'Thuỷ Trần', threads: '@thuy_mkt', plan: 'ENTERPRISE', time: '15p trước' },
    { id: 'U03', name: 'Minh Quân', threads: '@quan_cr', plan: 'FREE', time: '1h trước' },
  ];

  // Mock phân bổ gói
  const plans = [
    { name: 'Gói Free (Dùng thử)', users: 1425, color: '#908fa0' },
    { name: 'Gói Pro (Cá nhân)', users: 1180, color: '#c0c1ff' },
    { name: 'Gói Enterprise', users: 240, color: '#4edea3' },
  ];

  return (
    <div className="w-full h-full min-h-screen bg-[#13131f] text-[#f1f5f9] font-['Inter'] flex flex-col text-xs select-none relative">
      {/* Toast Notification khi bấm vào tính năng đang tạm ẩn */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-[#1e1e35] border border-[#c0c1ff]/30 text-[#f1f5f9] px-3 py-2 rounded-lg shadow-xl z-50 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Clock size={14} className="text-[#c0c1ff] shrink-0" />
            <span className="text-[11px]">{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-[#94a3b8] hover:text-white ml-2 p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

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

        {/* Nút Đăng xuất */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] rounded border border-[#ffb4ab]/30 transition text-[11px]"
          title="Đăng xuất"
        >
          <LogOut size={12} />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8">
        {/* Grid 4 chỉ số tóm tắt (2x2) */}
        <div className="grid grid-cols-2 gap-2">
          {summaryMetrics.map((item, idx) => (
            <div 
              key={idx}
              className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between shadow-xs"
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

        {/* 2 Navigation Cards (Đang tạm ẩn / Coming soon) */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#94a3b8] px-0.5">
            Chức năng quản trị
          </div>

          {/* Nav 1: Quản lý người dùng */}
          <div
            onClick={() => handleUnderDevelopment('Quản lý Người dùng')}
            className="w-full bg-[#1a1a2e]/70 border border-white/10 rounded-lg p-2.5 flex items-center justify-between transition cursor-pointer hover:bg-[#1a1a2e] group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4cd7f6]/10 text-[#4cd7f6] flex items-center justify-center border border-[#4cd7f6]/20 shrink-0">
                <Users size={16} />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-[12px] text-[#f1f5f9]">
                    Quản lý Người dùng
                  </span>
                  <span className="text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Sắp ra mắt
                  </span>
                </div>
                <div className="text-[10px] text-[#94a3b8]">
                  Theo dõi danh sách người dùng & tài khoản Threads
                </div>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#94a3b8]" />
          </div>

          {/* Nav 2: Quản lý gói đăng ký */}
          <div
            onClick={() => handleUnderDevelopment('Quản lý Gói đăng ký')}
            className="w-full bg-[#1a1a2e]/70 border border-white/10 rounded-lg p-2.5 flex items-center justify-between transition cursor-pointer hover:bg-[#1a1a2e] group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/10 text-[#c0c1ff] flex items-center justify-center border border-[#c0c1ff]/20 shrink-0">
                <CreditCard size={16} />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-[12px] text-[#f1f5f9]">
                    Quản lý Gói đăng ký
                  </span>
                  <span className="text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Sắp ra mắt
                  </span>
                </div>
                <div className="text-[10px] text-[#94a3b8]">
                  Cấu hình hạn mức và chính sách giá cước
                </div>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#94a3b8]" />
          </div>
        </div>

        {/* Bảng mini: User mới nhất */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-semibold text-[11px] text-[#f1f5f9]">User đăng ký mới nhất</span>
            <span className="text-[10px] text-[#94a3b8]">Thời gian thực</span>
          </div>

          <div className="divide-y divide-white/5">
            {recentUsers.map((u) => (
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
            <span className="text-[10px] text-[#4edea3]">Tổng: 2,845</span>
          </div>
          <div className="space-y-2 text-[10px]">
            {plans.map((p, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-[#94a3b8]">
                  <span>{p.name}</span>
                  <span className="font-['JetBrains_Mono'] text-white">{p.users} user</span>
                </div>
                <div className="w-full bg-[#0d0d14] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${(p.users / 2845) * 100}%`,
                      backgroundColor: p.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
