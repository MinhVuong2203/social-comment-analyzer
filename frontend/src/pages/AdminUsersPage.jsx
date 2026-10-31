import React from 'react';
import { 
  Users, 
  ArrowLeft, 
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const recentUsers = [
  { id: 'U01', name: 'Hoàng Nguyễn', threads: '@hoang_tech', plan: 'PRO', status: 'Hoạt động', time: 'Vừa xong' },
  { id: 'U02', name: 'Thuỷ Trần', threads: '@thuy_mkt', plan: 'ENTERPRISE', status: 'Hoạt động', time: '15p trước' },
  { id: 'U03', name: 'Minh Quân', threads: '@quan_cr', plan: 'FREE', status: 'Chờ duyệt', time: '1h trước' },
  { id: 'U04', name: 'Đức Duy', threads: '@duy_ai', plan: 'PRO', status: 'Hoạt động', time: '3h trước' },
  { id: 'U05', name: 'Ngọc Ánh', threads: '@anh_insights', plan: 'PRO', status: 'Hoạt động', time: '5h trước' },
];

export default function AdminUsersPage() {
  const navigate = useNavigate();

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
              <span className="px-1 py-0.2 rounded text-[8px] font-['JetBrains_Mono'] bg-[#4cd7f6]/20 text-[#4cd7f6] border border-[#4cd7f6]/30">
                2,845 Users
              </span>
            </div>
            <p className="text-[9px] text-[#94a3b8] leading-none">Tài khoản kết nối Threads OAuth</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-8">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Tìm tên, email, @threads..."
            className="w-full h-8 pl-8 pr-3 bg-[#1a1a2e] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#4cd7f6]"
          />
        </div>

        {/* User List */}
        <div className="space-y-1.5">
          {recentUsers.map((u) => (
            <div 
              key={u.id}
              className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex items-center justify-between hover:border-white/20 transition"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-[12px] text-white">{u.name}</span>
                  <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-semibold ${
                    u.plan === 'PRO' ? 'bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30' :
                    u.plan === 'ENTERPRISE' ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30' :
                    'bg-white/5 text-[#94a3b8]'
                  }`}>
                    {u.plan}
                  </span>
                </div>
                <div className="text-[10px] text-[#4cd7f6] font-['JetBrains_Mono']">
                  {u.threads}
                </div>
                <div className="text-[9px] text-[#94a3b8]">
                  Trạng thái: <span className="text-[#4edea3]">{u.status}</span> • {u.time}
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <button className="px-2 py-0.5 bg-[#282a30] hover:bg-[#33343b] text-[#f1f5f9] rounded text-[10px] transition">
                  Chi tiết
                </button>
                <button className="px-2 py-0.5 bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] rounded text-[10px] transition">
                  Khóa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

