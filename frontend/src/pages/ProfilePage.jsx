import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  Sparkles, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getUserProfile, 
  createPayOSPayment, 
  checkPaymentStatus
} from '../services/paymentService';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load user profile and plans from backend
  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Lỗi nạp profile:', err);
      // Fallback display using authUser
      setProfileData({
        id: authUser?.id || 1,
        username: authUser?.username || 'user',
        name: authUser?.name || 'Người dùng Threads',
        profilePictureUrl: authUser?.profilePicture || '',
        role: authUser?.role || 'USER',
        status: 'ACTIVE',
        isVip: false,
        activeSubscription: null,
        availablePlans: [
          { id: 1, planCode: 'VIP_30_DAYS', planName: 'VIP 30 ngày', price: 99000, durationDays: 30, description: 'Quyền sử dụng VIP trong 30 ngày' },
          { id: 2, planCode: 'VIP_90_DAYS', planName: 'VIP 90 ngày', price: 249000, durationDays: 90, description: 'Quyền sử dụng VIP trong 90 ngày (Tiết kiệm 15%)' },
          { id: 3, planCode: 'VIP_365_DAYS', planName: 'VIP 365 ngày', price: 799000, durationDays: 365, description: 'Quyền sử dụng VIP trong 365 ngày (Tiết kiệm 35%)' }
        ],
        paymentHistory: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Xử lý khi PayOS chuyển hướng trở lại (sau khi thanh toán xong hoặc hủy)
  useEffect(() => {
    const payment = searchParams.get('payment');
    const status = searchParams.get('status');
    const orderCode = searchParams.get('orderCode');

    if (payment === 'success' || status === 'PAID') {
      if (orderCode) {
        // Đồng bộ và kiểm tra trạng thái ngay lập tức
        checkPaymentStatus(orderCode)
          .then((res) => {
            if (res.status === 'SUCCESS' || res.status === 'PAID') {
              showToast('Thanh toán thành công! Gói VIP đã được kích hoạt.');
            } else {
              showToast('Giao dịch đã được ghi nhận, đang chờ xác nhận.', 'info');
            }
            loadProfile();
          })
          .catch(() => {
            showToast('Thanh toán thành công! Đang tải lại dữ liệu gói VIP.');
            loadProfile();
          });
      } else {
        showToast('Thanh toán thành công! Gói VIP đã được kích hoạt.');
        loadProfile();
      }
      setSearchParams({}, { replace: true });
    } else if (payment === 'cancel' || status === 'CANCELLED') {
      showToast('Giao dịch thanh toán đã bị hủy hoặc chưa hoàn tất.', 'info');
      setSearchParams({}, { replace: true });
      loadProfile();
    }
  }, [searchParams]);

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  // Handle Select Plan to Purchase - Chuyển thẳng đến trang thanh toán của PayOS
  const handleSelectPlan = async (plan) => {
    if (isVip) {
      showToast('Bạn hiện đang có gói VIP còn hiệu lực, không thể đăng ký thêm gói mới.', 'info');
      return;
    }

    try {
      setPaymentLoading(true);
      setSelectedPlanId(plan.id);

      // Tạo returnUrl và cancelUrl dẫn về trang Profile kèm tham số
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const baseHashUrl = `${origin}${pathname}#/profile`;

      const res = await createPayOSPayment({
        vipPlanId: plan.id,
        returnUrl: `${baseHashUrl}?payment=success`,
        cancelUrl: `${baseHashUrl}?payment=cancel`
      });

      if (res && res.checkoutUrl) {
        showToast(`Đang chuyển đến cổng thanh toán PayOS...`);
        // Chuyển thẳng đến trang web thanh toán của PayOS
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error('Không nhận được liên kết thanh toán từ cổng PayOS.');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi khởi tạo thanh toán', 'error');
      setPaymentLoading(false);
      setSelectedPlanId(null);
    }
  };

  const user = profileData || authUser || {};
  const isVip = profileData?.isVip;
  const activeSub = profileData?.activeSubscription;

  return (
    <div className="w-full h-full min-h-screen bg-[#13131f] text-[#f1f5f9] font-['Inter'] flex flex-col text-xs select-none">
      {/* Toast Alert */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-3.5 py-2.5 rounded-lg text-xs font-medium shadow-2xl flex items-center space-x-2 transition-all ${
          notification.type === 'error' ? 'bg-[#ef4444] text-white border border-red-300' :
          notification.type === 'info' ? 'bg-[#3b82f6] text-white border border-blue-300' :
          'bg-[#10b981] text-white border border-emerald-300'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-[#0d0d14]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/overview')}
            className="p-1.5 rounded-lg bg-[#1e1e35] text-[#c0c1ff] hover:bg-[#282a30] transition"
            title="Quay lại Tổng quan"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-[13px] text-white flex items-center gap-1.5">
              <span>Trang Cá Nhân & Gói VIP</span>
              {isVip && <span className="text-[#ffd700]"><Crown size={13} /></span>}
            </h2>
            <p className="text-[10px] text-[#94a3b8]">Thông tin tài khoản & Nâng cấp quyền lợi</p>
          </div>
        </div>

        <button 
          onClick={loadProfile}
          className="p-1.5 rounded-lg bg-[#1a1a2e] text-[#94a3b8] hover:text-white hover:bg-[#282a30] transition"
          title="Tải lại"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#4cd7f6]' : ''} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 pb-16">
        
        {/* ========================================================= */}
        {/* 1. USER PROFILE CARD */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#161626] to-[#121220] border border-white/10 rounded-xl p-3.5 space-y-3 shadow-lg relative overflow-hidden">
          <div className="flex items-center space-x-3 relative z-10">
            {/* User Avatar */}
            <div className="relative">
              {user.profilePictureUrl || user.profilePicture ? (
                <img 
                  src={user.profilePictureUrl || user.profilePicture} 
                  alt="Avatar" 
                  className="w-13 h-13 rounded-full object-cover border-2 border-[#c0c1ff]/40 shadow-md"
                />
              ) : (
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#22d3ee] flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isVip && (
                <div className="absolute -bottom-1 -right-1 bg-[#ffd700] text-[#0d0d14] rounded-full p-0.5 shadow">
                  <Crown size={11} />
                </div>
              )}
            </div>

            {/* User Meta */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <h3 className="font-bold text-[14px] text-white truncate">
                  {user.name || 'Người dùng Threads'}
                </h3>
                <span className={`text-[9px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-bold ${
                  isVip 
                    ? 'bg-amber-400/20 text-[#ffd700] border border-amber-400/40' 
                    : 'bg-white/10 text-[#94a3b8]'
                }`}>
                  {isVip ? '👑 VIP MEMBER' : 'FREE TIER'}
                </span>
              </div>

              <div className="text-[11px] text-[#4cd7f6] font-['JetBrains_Mono'] mt-0.5">
                {user.username ? `@${user.username}` : '@threads_user'}
              </div>

              <div className="text-[10px] text-[#94a3b8] mt-0.5 flex items-center space-x-2">
                <span>Trạng thái: <strong className="text-[#10b981]">Hoạt động</strong></span>
                <span>•</span>
                <span>ID: <code className="font-['JetBrains_Mono']">{user.threadsUserId || user.id || 'N/A'}</code></span>
              </div>
            </div>
          </div>

          {/* Current VIP Plan Banner */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
            isVip 
              ? 'bg-[#1a1b35] border-[#ffd700]/30' 
              : 'bg-[#13131f] border-white/5'
          }`}>
            <div className="space-y-0.5">
              <div className="text-[10px] text-[#94a3b8] flex items-center space-x-1">
                <span>Gói dịch vụ hiện tại:</span>
              </div>
              <div className="font-bold text-[12px] text-white flex items-center space-x-1.5">
                <span>{isVip ? (activeSub?.planName || 'Gói VIP Cá nhân') : 'Gói Miễn phí (Dùng thử)'}</span>
                {isVip && activeSub?.daysRemaining !== undefined && (
                  <span className="text-[10px] font-semibold text-[#4cd7f6] font-['JetBrains_Mono']">
                    (Còn {activeSub.daysRemaining} ngày)
                  </span>
                )}
              </div>
              {isVip && activeSub?.endAt && (
                <div className="text-[9px] text-[#94a3b8]">
                  Hạn sử dụng: <strong className="text-white">{formatDate(activeSub.endAt)}</strong>
                </div>
              )}
            </div>

            {!isVip && (
              <span className="text-[10px] px-2 py-1 rounded bg-[#c0c1ff]/15 text-[#c0c1ff] font-semibold border border-[#c0c1ff]/30">
                Chưa kích hoạt VIP
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. VIP PLANS LIST */}
        {/* ========================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-[13px] flex items-center space-x-1.5">
                <Sparkles size={14} className="text-[#ffd700]" />
                <span>Nâng cấp Gói VIP</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {profileData?.availablePlans?.map((plan) => {
              const isBest = plan.planCode === 'VIP_90_DAYS';
              const isPro = plan.planCode === 'VIP_365_DAYS';
              const isCurrentProcessing = paymentLoading && selectedPlanId === plan.id;

              return (
                <div 
                  key={plan.id}
                  className={`bg-[#1a1a2e] border rounded-xl p-3 flex flex-col justify-between space-y-3 relative transition-all ${
                    isVip 
                      ? 'opacity-80 border-white/5' 
                      : isBest 
                      ? 'border-[#c0c1ff]/40 bg-[#1b1c33] hover:border-[#c0c1ff]/50 hover:shadow-xl' 
                      : 'border-white/10 hover:border-[#c0c1ff]/50 hover:shadow-xl'
                  }`}
                >

                  <div className="space-y-2">
                    <div>
                      <h4 className="font-bold text-[13px] text-white">{plan.planName}</h4>
                      <p className="text-[10px] text-[#94a3b8] mt-0.5">{plan.description}</p>
                    </div>

                    <div className="py-1">
                      <div className="font-['JetBrains_Mono'] text-base font-bold text-[#4edea3]">
                        {formatVND(plan.price)}
                      </div>
                      <div className="text-[9px] text-[#94a3b8] font-['JetBrains_Mono']">
                        Thời hạn: <strong className="text-white">{plan.durationDays} ngày</strong>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-1 pt-1.5 border-t border-white/5 text-[10px] text-[#cbd5e1]">
                      <div className="flex items-center space-x-1.5">
                        <Check size={12} className="text-[#10b981] shrink-0" />
                        <span>Quét không giới hạn bài viết Threads</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Check size={12} className="text-[#10b981] shrink-0" />
                        <span>Mở khóa cài đặt ngưỡng cảnh báo</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Check size={12} className="text-[#10b981] shrink-0" />
                        <span>Xuất báo cáo dữ liệu định dạng CSV / JSON</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={paymentLoading || isVip}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow ${
                      isVip
                        ? 'bg-[#1e1e30] text-[#64748b] cursor-not-allowed border border-white/5'
                        : isBest 
                        ? 'bg-[#c0c1ff] hover:bg-[#a9abff] text-[#1000a9]'
                        : isPro
                        ? 'bg-gradient-to-r from-[#ffd700] to-[#f59e0b] hover:opacity-90 text-[#0d0d14]'
                        : 'bg-[#282a30] hover:bg-[#33343b] text-white'
                    } ${isCurrentProcessing ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {isVip ? (
                      <>
                        <Check size={13} className="text-[#10b981]" />
                        <span>Đang có gói VIP</span>
                      </>
                    ) : isCurrentProcessing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Đang chuyển đến PayOS...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} />
                        <span>Mua gói này</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. TRANSACTION HISTORY */}
        {/* ========================================================= */}
        {profileData?.paymentHistory && profileData.paymentHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="font-bold text-white text-[12px] flex items-center space-x-1.5">
              <Clock size={13} className="text-[#94a3b8]" />
              <span>Lịch sử thanh toán của bạn</span>
            </h3>

            <div className="space-y-1.5">
              {profileData.paymentHistory.map((tx) => (
                <div 
                  key={tx.id}
                  className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-['JetBrains_Mono'] font-bold text-white text-[11px]">
                        #{tx.orderCode}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-['JetBrains_Mono'] bg-white/10 text-[#4cd7f6]">
                        {tx.paymentProvider}
                      </span>
                      <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-bold ${
                        tx.status === 'SUCCESS' ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30' :
                        tx.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#94a3b8]">
                      Thời gian: {formatDate(tx.paidAt || tx.createdAt)} • Phương thức: {tx.paymentMethod || 'VietQR'}
                    </div>
                  </div>

                  <div className="font-['JetBrains_Mono'] font-bold text-[12px] text-[#4edea3]">
                    {formatVND(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

