import React from 'react';
import { 
  CreditCard, 
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const plans = [
  { name: 'Gói Free (Dùng thử)', price: '0 ₫', users: 1425, quota: '15 bài quét / tháng', color: '#908fa0' },
  { name: 'Gói Pro (Cá nhân)', price: '199,000 ₫', users: 1180, quota: 'Không giới hạn bài quét & realtime', color: '#c0c1ff', hot: true },
  { name: 'Gói Enterprise', price: '899,000 ₫', users: 240, quota: 'API riêng & PhoBERT Model Support 24/7', color: '#4edea3' },
];

export default function AdminSubscriptionsPage() {
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
                Quản lý Gói đăng ký
              </span>
              <span className="px-1 py-0.2 rounded text-[8px] font-['JetBrains_Mono'] bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30">
                3 Gói
              </span>
            </div>
            <p className="text-[9px] text-[#94a3b8] leading-none">Chính sách giá & Hạn mức</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-8">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] text-[#94a3b8]">Danh sách gói cước hoạt động</span>
          <button className="px-2 py-1 bg-[#c0c1ff] hover:bg-[#b0b2ff] text-[#1000a9] font-semibold text-[10px] rounded transition">
            + Thêm gói
          </button>
        </div>

        <div className="space-y-2">
          {plans.map((p, idx) => (
            <div 
              key={idx}
              className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[12px] text-white">{p.name}</h4>
                  <p className="font-['JetBrains_Mono'] text-sm font-bold text-[#4edea3]">{p.price}</p>
                </div>
                {p.hot && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#c0c1ff]/15 text-[#c0c1ff] font-['JetBrains_Mono'] border border-[#c0c1ff]/30">
                    PHỔ BIẾN
                  </span>
                )}
              </div>

              <div className="text-[10px] text-[#94a3b8] space-y-1 pt-1 border-t border-white/5">
                <div>• Hạn mức: <span className="text-white">{p.quota}</span></div>
                <div>• Hội viên: <span className="text-white">{p.users} người đang dùng</span></div>
              </div>

              <div className="pt-1 flex space-x-1.5">
                <button className="flex-1 py-1 bg-[#282a30] hover:bg-[#33343b] rounded text-[10px] text-white transition">
                  Chỉnh sửa giá
                </button>
                <button className="flex-1 py-1 bg-[#1e1e35] hover:bg-[#282a30] rounded text-[10px] text-[#c0c1ff] border border-white/10 transition">
                  Quota & Tính năng
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

