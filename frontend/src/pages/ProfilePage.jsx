import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  Sparkles, 
  CreditCard, 
  Clock, 
  Calendar, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  X,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getUserProfile, 
  createPayOSPayment, 
  checkPaymentStatus, 
  cancelPayOSPayment 
} from '../services/paymentService';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // PayOS Checkout Modal State
  const [checkoutModal, setCheckoutModal] = useState(null);
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

  // Handle Select Plan to Purchase
  const handleSelectPlan = async (plan) => {
    try {
      setPaymentLoading(true);
      const currentUrl = window.location.href.split('?')[0];
      const res = await createPayOSPayment({
        vipPlanId: plan.id,
        returnUrl: `${currentUrl}?payment=success`,
        cancelUrl: `${currentUrl}?payment=cancel`
      });

      // Show PayOS Modal
      setCheckoutModal({
        plan,
        orderCode: res.orderCode,
        amount: res.amount || plan.price,
        description: res.description,
        checkoutUrl: res.checkoutUrl,
        qrCode: res.qrCode,
        accountNumber: res.accountNumber || '6910889701',
        accountName: res.accountName || 'NGUYEN MINH VUONG',
        bin: res.bin || '970415'
      });

      showToast(`Đã tạo liên kết thanh toán cho ${plan.planName}`);
    } catch (err) {
      showToast(err.message || 'Lỗi khi khởi tạo thanh toán', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Check payment status manually
  const handleCheckPayment = async () => {
    if (!checkoutModal?.orderCode) return;
    try {
      setCheckingPayment(true);
      const res = await checkPaymentStatus(checkoutModal.orderCode);
      if (res.status === 'SUCCESS' || res.status === 'PAID') {
        showToast('Thanh toán thành công! Gói VIP đã được kích hoạt.');
        setCheckoutModal(null);
        loadProfile();
      } else if (res.status === 'CANCELLED') {
        showToast('Giao dịch này đã bị hủy.', 'error');
        setCheckoutModal(null);
        loadProfile();
      } else {
        showToast('Đang chờ giao dịch hoàn tất từ ngân hàng...', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Chưa nhận được giao dịch', 'error');
    } finally {
      setCheckingPayment(false);
    }
  };

  // Cancel payment
  const handleCancelPayment = async () => {
    if (!checkoutModal?.orderCode) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy giao dịch này không?')) return;
    try {
      await cancelPayOSPayment(checkoutModal.orderCode, 'Người dùng hủy thanh toán');
      showToast('Đã hủy giao dịch thanh toán.');
      setCheckoutModal(null);
      loadProfile();
    } catch (err) {
      showToast(err.message || 'Không thể hủy giao dịch', 'error');
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
                <span>Nâng cấp Gói VIP (PayOS VietQR)</span>
              </h3>
              <p className="text-[10px] text-[#94a3b8]">
                Mở khóa phân tích sâu, quét không giới hạn bình luận Threads
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {profileData?.availablePlans?.map((plan, idx) => {
              const isBest = plan.planCode === 'VIP_90_DAYS';
              const isPro = plan.planCode === 'VIP_365_DAYS';

              return (
                <div 
                  key={plan.id}
                  className={`bg-[#1a1a2e] border rounded-xl p-3 flex flex-col justify-between space-y-3 relative transition-all hover:border-[#c0c1ff]/50 hover:shadow-xl ${
                    isBest ? 'border-[#c0c1ff]/40 bg-[#1b1c33]' : 'border-white/10'
                  }`}
                >
                  {isBest && (
                    <div className="absolute -top-2.5 right-3 bg-[#c0c1ff] text-[#1000a9] text-[8px] font-bold font-['JetBrains_Mono'] px-2 py-0.5 rounded-full shadow">
                      PHỔ BIẾN NHẤT
                    </div>
                  )}

                  {isPro && (
                    <div className="absolute -top-2.5 right-3 bg-[#ffd700] text-[#0d0d14] text-[8px] font-bold font-['JetBrains_Mono'] px-2 py-0.5 rounded-full shadow">
                      TIẾT KIỆM 35%
                    </div>
                  )}

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
                        <span>AI PhoBERT nhận diện tiếng lóng, mỉa mai</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Check size={12} className="text-[#10b981] shrink-0" />
                        <span>Phát hiện toxic, hateful comment tự động</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Check size={12} className="text-[#10b981] shrink-0" />
                        <span>Xuất báo cáo dữ liệu định dạng CSV / JSON</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={paymentLoading}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow ${
                      isBest 
                        ? 'bg-[#c0c1ff] hover:bg-[#a9abff] text-[#1000a9]'
                        : isPro
                        ? 'bg-gradient-to-r from-[#ffd700] to-[#f59e0b] hover:opacity-90 text-[#0d0d14]'
                        : 'bg-[#282a30] hover:bg-[#33343b] text-white'
                    }`}
                  >
                    <CreditCard size={13} />
                    <span>Mua gói này</span>
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

      {/* ========================================================= */}
      {/* 4. PAYOS VIETQR CHECKOUT MODAL */}
      {/* ========================================================= */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#1a1a2e] border border-[#c0c1ff]/30 rounded-2xl w-full max-w-sm p-4 space-y-3.5 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center space-x-1.5">
                <span className="text-base">💳</span>
                <div>
                  <h3 className="font-bold text-white text-sm">Thanh toán PayOS VietQR</h3>
                  <p className="text-[10px] text-[#94a3b8]">Đơn hàng #{checkoutModal.orderCode}</p>
                </div>
              </div>
              <button 
                onClick={() => setCheckoutModal(null)}
                className="p-1 text-[#94a3b8] hover:text-white rounded"
              >
                <X size={15} />
              </button>
            </div>

            {/* VietQR Code Display */}
            <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center shadow-inner">
              <img 
                src={`https://img.vietqr.io/image/BIDV-${checkoutModal.accountNumber}-compact2.png?amount=${checkoutModal.amount}&addInfo=${encodeURIComponent(checkoutModal.description)}&accountName=${encodeURIComponent(checkoutModal.accountName)}`}
                alt="VietQR PayOS" 
                className="w-48 h-48 object-contain"
              />
              <span className="text-[10px] text-[#13131f] font-semibold font-['JetBrains_Mono'] mt-1">
                Quét mã bằng App Ngân hàng bất kỳ
              </span>
            </div>

            {/* Payment Details */}
            <div className="bg-[#13131f] p-2.5 rounded-lg border border-white/5 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Gói đăng ký:</span>
                <span className="font-bold text-white">{checkoutModal.plan?.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Số tiền cần thanh toán:</span>
                <span className="font-['JetBrains_Mono'] font-bold text-[#10b981] text-[13px]">
                  {formatVND(checkoutModal.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Ngân hàng nhận:</span>
                <span className="font-semibold text-white">BIDV ({checkoutModal.accountNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Chủ tài khoản:</span>
                <span className="font-semibold text-white uppercase">{checkoutModal.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Nội dung chuyển khoản:</span>
                <span className="font-['JetBrains_Mono'] font-bold text-[#c0c1ff]">
                  {checkoutModal.description}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {checkoutModal.checkoutUrl && (
                <a 
                  href={checkoutModal.checkoutUrl}
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-lg transition flex items-center justify-center space-x-1.5 shadow"
                >
                  <ExternalLink size={14} />
                  <span>Mở trang thanh toán PayOS</span>
                </a>
              )}

              <div className="flex space-x-2">
                <button 
                  onClick={handleCheckPayment}
                  disabled={checkingPayment}
                  className="flex-1 py-1.5 bg-[#c0c1ff] hover:bg-[#a9abff] text-[#1000a9] font-bold rounded-lg transition flex items-center justify-center space-x-1"
                >
                  <RefreshCw size={12} className={checkingPayment ? 'animate-spin' : ''} />
                  <span>{checkingPayment ? 'Đang kiểm tra...' : 'Kiểm tra kết quả'}</span>
                </button>

                <button 
                  onClick={handleCancelPayment}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold rounded-lg transition"
                >
                  Hủy đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

