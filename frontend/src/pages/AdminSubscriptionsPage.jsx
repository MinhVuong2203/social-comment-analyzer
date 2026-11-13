import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  UserCheck, 
  DollarSign, 
  Calendar,
  X,
  Check,
  Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getVipPlans,
  createVipPlan,
  updateVipPlan,
  toggleVipPlanActive,
  deleteVipPlan,
  getUserSubscriptions,
  updateSubscriptionStatus,
  manualGrantSubscription,
  getPaymentTransactions,
  getSubscriptionStats
} from '../services/adminSubscriptionService';

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'subscriptions' | 'payments'

  // Data States
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    activeSubscriptions: 0,
    pendingSubscriptions: 0,
    totalRevenue: 0,
    totalTransactions: 0
  });

  const [loading, setLoading] = useState(true);
  const [subStatusFilter, setSubStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    planCode: '',
    planName: '',
    description: '',
    price: '',
    durationDays: '',
    isActive: true
  });

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    userId: '',
    username: '',
    vipPlanId: '',
    customDurationDays: ''
  });

  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, subsData, paymentsData, statsData] = await Promise.all([
        getVipPlans(),
        getUserSubscriptions(subStatusFilter),
        getPaymentTransactions(),
        getSubscriptionStats()
      ]);
      setPlans(plansData);
      setSubscriptions(subsData);
      setPayments(paymentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu gói VIP:', err);
      showNotification('Không thể tải một số dữ liệu từ máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subStatusFilter]);

  // Format currency
  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Format date
  const formatDate = (isoString) => {
    if (!isoString) return 'Chưa kích hoạt';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  // Handle Plan Modal Submit
  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.planCode.trim() || !planForm.planName.trim()) {
      showNotification('Vui lòng nhập đầy đủ Mã gói và Tên gói!', 'error');
      return;
    }
    if (Number(planForm.price) < 0 || Number(planForm.durationDays) <= 0) {
      showNotification('Giá không âm và thời hạn phải lớn hơn 0 ngày!', 'error');
      return;
    }

    try {
      if (editingPlan) {
        await updateVipPlan(editingPlan.id, planForm);
        showNotification(`Đã cập nhật gói ${planForm.planName}`);
      } else {
        await createVipPlan(planForm);
        showNotification(`Đã tạo gói mới: ${planForm.planName}`);
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      loadData();
    } catch (err) {
      showNotification(err.message || 'Lỗi khi lưu gói VIP', 'error');
    }
  };

  // Open Edit Plan Modal
  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      planCode: plan.planCode,
      planName: plan.planName,
      description: plan.description || '',
      price: plan.price,
      durationDays: plan.durationDays,
      isActive: plan.isActive
    });
    setIsPlanModalOpen(true);
  };

  // Open Create Plan Modal
  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      planCode: '',
      planName: '',
      description: '',
      price: 99000,
      durationDays: 30,
      isActive: true
    });
    setIsPlanModalOpen(true);
  };

  // Handle Toggle Active
  const handleToggleActive = async (id, name) => {
    try {
      const updated = await toggleVipPlanActive(id);
      showNotification(`Gói ${name} đã ${updated.isActive ? 'BẬT' : 'TẮT'} kinh doanh.`);
      loadData();
    } catch (err) {
      showNotification('Không thể thay đổi trạng thái', 'error');
    }
  };

  // Handle Delete Plan
  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa gói VIP "${name}"?`)) return;
    try {
      await deleteVipPlan(id);
      showNotification(`Đã xóa gói ${name}`);
      loadData();
    } catch (err) {
      showNotification(err.message || 'Không thể xóa gói VIP', 'error');
    }
  };

  // Handle Subscription Status Change
  const handleStatusChange = async (subId, newStatus) => {
    try {
      await updateSubscriptionStatus(subId, newStatus);
      showNotification(`Đã chuyển trạng thái hội viên sang ${newStatus}`);
      loadData();
    } catch (err) {
      showNotification('Không thể cập nhật trạng thái', 'error');
    }
  };

  // Handle Manual Grant Submit
  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!grantForm.userId || !grantForm.vipPlanId) {
      showNotification('Vui lòng chọn User ID và Gói VIP', 'error');
      return;
    }

    try {
      await manualGrantSubscription({
        userId: grantForm.userId,
        username: grantForm.username,
        vipPlanId: grantForm.vipPlanId,
        customDurationDays: grantForm.customDurationDays
      });
      showNotification(`Đã cấp quyền VIP cho User #${grantForm.userId}`);
      setIsGrantModalOpen(false);
      setGrantForm({ userId: '', username: '', vipPlanId: '', customDurationDays: '' });
      loadData();
    } catch (err) {
      showNotification('Lỗi khi cấp VIP thủ công', 'error');
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#13131f] text-[#f1f5f9] font-['Inter'] flex flex-col text-xs select-none">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-medium shadow-xl flex items-center space-x-2 transition-all ${
            notification.type === 'error' 
              ? 'bg-[#ef4444] text-white border border-red-300' 
              : 'bg-[#10b981] text-white border border-emerald-300'
          }`}
        >
          {notification.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-[#0d0d14]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="p-1.5 rounded-lg bg-[#1e1e35] text-[#c0c1ff] hover:bg-[#282a30] transition"
            title="Quay lại Dashboard"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-[13px] text-white">
                Quản lý Gói VIP & Hội viên
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-['JetBrains_Mono'] bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30 font-semibold">
                VIP MANAGEMENT
              </span>
            </div>
            <p className="text-[10px] text-[#94a3b8] leading-tight">Cấu hình bảng giá vip_plans & Hội viên user_subscriptions</p>
          </div>
        </div>

        <button 
          onClick={loadData}
          className="p-1.5 rounded-lg bg-[#1a1a2e] text-[#94a3b8] hover:text-white hover:bg-[#282a30] transition flex items-center space-x-1"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#4cd7f6]' : ''} />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="px-3.5 pt-3 pb-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-[10px]">Gói VIP mở bán</span>
            <Sparkles size={13} className="text-[#c0c1ff]" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-base font-bold font-['JetBrains_Mono'] text-white">{stats.activePlans}</span>
            <span className="text-[10px] text-[#94a3b8]">/ {stats.totalPlans} gói</span>
          </div>
        </div>

        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-[10px]">Hội viên VIP Active</span>
            <UserCheck size={13} className="text-[#10b981]" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-base font-bold font-['JetBrains_Mono'] text-[#10b981]">{stats.activeSubscriptions}</span>
            <span className="text-[10px] text-[#94a3b8]">tài khoản</span>
          </div>
        </div>

        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-[10px]">Chờ kích hoạt</span>
            <Clock size={13} className="text-[#f59e0b]" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-base font-bold font-['JetBrains_Mono'] text-[#f59e0b]">{stats.pendingSubscriptions}</span>
            <span className="text-[10px] text-[#94a3b8]">yêu cầu</span>
          </div>
        </div>

        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-[10px]">Doanh thu VIP</span>
            <DollarSign size={13} className="text-[#4cd7f6]" />
          </div>
          <div className="text-sm font-bold font-['JetBrains_Mono'] text-[#4cd7f6] truncate">
            {formatVND(stats.totalRevenue)}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="px-3.5 border-b border-white/10 flex space-x-1 pt-1 bg-[#0d0d14]/40">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-3 py-1.5 font-semibold text-[11px] rounded-t-md transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'plans'
              ? 'text-white border-[#c0c1ff] bg-[#1a1a2e]'
              : 'text-[#94a3b8] border-transparent hover:text-white'
          }`}
        >
          <CreditCard size={13} />
          <span>Danh mục Gói VIP ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-3 py-1.5 font-semibold text-[11px] rounded-t-md transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'subscriptions'
              ? 'text-white border-[#4cd7f6] bg-[#1a1a2e]'
              : 'text-[#94a3b8] border-transparent hover:text-white'
          }`}
        >
          <UserCheck size={13} />
          <span>Đăng ký VIP ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3 py-1.5 font-semibold text-[11px] rounded-t-md transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'payments'
              ? 'text-white border-[#10b981] bg-[#1a1a2e]'
              : 'text-[#94a3b8] border-transparent hover:text-white'
          }`}
        >
          <DollarSign size={13} />
          <span>Giao dịch ({payments.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-12">
        {/* ======================================================== */}
        {/* TAB 1: DANH MỤC GÓI VIP (vip_plans) */}
        {/* ======================================================== */}
        {activeTab === 'plans' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-[12px]">Bảng giá gói cước Threads VIP</h3>
                <p className="text-[10px] text-[#94a3b8]">Bảng dữ liệu: <code className="text-[#c0c1ff] font-['JetBrains_Mono']">vip_plans</code></p>
              </div>
              <button 
                onClick={openCreatePlan}
                className="px-2.5 py-1.5 bg-[#c0c1ff] hover:bg-[#8083ff] text-[#1000a9] font-semibold text-[11px] rounded-lg transition flex items-center space-x-1 shadow-md"
              >
                <Plus size={13} />
                <span>Thêm gói VIP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {plans.map((p) => (
                <div 
                  key={p.id}
                  className={`bg-[#1a1a2e] border rounded-lg p-3 space-y-2.5 flex flex-col justify-between transition-all hover:border-[#c0c1ff]/50 ${
                    p.isActive ? 'border-white/10' : 'border-red-500/20 opacity-70 bg-[#161622]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-bold text-[13px] text-white">{p.planName}</h4>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-['JetBrains_Mono'] bg-white/10 text-[#c0c1ff] border border-white/10">
                            {p.planCode}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#94a3b8] mt-0.5 line-clamp-2">{p.description || 'Không có mô tả chi tiết'}</p>
                      </div>

                      <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.5 rounded font-bold ${
                        p.isActive 
                          ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30' 
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {p.isActive ? 'ĐANG MỞ BÁN' : 'TẠM DỪNG'}
                      </span>
                    </div>

                    <div className="bg-[#13131f] p-2 rounded-md border border-white/5 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-[#94a3b8]">Giá cước:</span>
                        <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#4edea3]">
                          {formatVND(p.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                        <span>Thời hạn:</span>
                        <span className="text-white font-semibold font-['JetBrains_Mono']">{p.durationDays} ngày</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                        <span>Hội viên đang dùng:</span>
                        <span className="text-[#c0c1ff] font-semibold font-['JetBrains_Mono']">{p.activeSubscribers || 0} users</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center space-x-1.5 border-t border-white/5">
                    <button 
                      onClick={() => openEditPlan(p)}
                      className="flex-1 py-1 bg-[#282a30] hover:bg-[#33343b] text-white rounded text-[10px] font-medium transition flex items-center justify-center space-x-1"
                    >
                      <Edit2 size={11} />
                      <span>Sửa gói</span>
                    </button>
                    <button 
                      onClick={() => handleToggleActive(p.id, p.planName)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition flex items-center space-x-1 ${
                        p.isActive 
                          ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20' 
                          : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/20'
                      }`}
                      title={p.isActive ? "Tạm ngưng mở bán" : "Kích hoạt mở bán"}
                    >
                      <Power size={11} />
                      <span>{p.isActive ? 'Tắt' : 'Bật'}</span>
                    </button>
                    <button 
                      onClick={() => handleDeletePlan(p.id, p.planName)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                      title="Xóa gói VIP"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: QUẢN LÝ HỘI VIÊN (user_subscriptions) */}
        {/* ======================================================== */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-2.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white text-[12px]">Lịch sử đăng ký & gia hạn gói VIP</h3>
                <p className="text-[10px] text-[#94a3b8]">Bảng dữ liệu: <code className="text-[#4cd7f6] font-['JetBrains_Mono']">user_subscriptions</code></p>
              </div>

              <div className="flex items-center space-x-1.5">
                {/* Filter buttons */}
                {['', 'ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSubStatusFilter(st)}
                    className={`px-2 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] transition ${
                      subStatusFilter === st 
                        ? 'bg-[#4cd7f6] text-[#0c0e14] font-bold' 
                        : 'bg-[#1a1a2e] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {st === '' ? 'Tất cả' : st}
                  </button>
                ))}

                <button 
                  onClick={() => setIsGrantModalOpen(true)}
                  className="px-2.5 py-1 bg-[#4cd7f6] hover:bg-[#38bdf8] text-[#0c0e14] font-bold text-[10px] rounded-lg transition flex items-center space-x-1"
                >
                  <Plus size={12} />
                  <span>Cấp VIP</span>
                </button>
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="space-y-1.5">
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-[#94a3b8] bg-[#1a1a2e]/40 rounded-lg border border-white/5">
                  Không có lượt đăng ký nào phù hợp.
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div 
                    key={sub.id}
                    className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex items-center justify-between hover:border-white/20 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-[12px] text-white">
                          {sub.username ? `@${sub.username}` : `User #${sub.userId}`}
                        </span>
                        <span className="text-[9px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-bold bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30">
                          {sub.planName}
                        </span>
                        <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-bold ${
                          sub.status === 'ACTIVE' ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30' :
                          sub.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          sub.status === 'EXPIRED' ? 'bg-white/10 text-[#94a3b8]' :
                          'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      <div className="text-[10px] text-[#94a3b8] flex items-center space-x-3 font-['JetBrains_Mono']">
                        <span>Bắt đầu: <strong className="text-white">{formatDate(sub.startAt)}</strong></span>
                        <span>•</span>
                        <span>Hết hạn: <strong className="text-white">{formatDate(sub.endAt)}</strong></span>
                        {sub.status === 'ACTIVE' && sub.daysRemaining !== null && (
                          <>
                            <span>•</span>
                            <span className="text-[#4cd7f6] font-semibold">Còn {sub.daysRemaining} ngày</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {sub.status === 'PENDING' && (
                        <button 
                          onClick={() => handleStatusChange(sub.id, 'ACTIVE')}
                          className="px-2 py-1 bg-[#10b981] hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition flex items-center space-x-1"
                        >
                          <Check size={11} />
                          <span>Duyệt VIP</span>
                        </button>
                      )}

                      {sub.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handleStatusChange(sub.id, 'CANCELLED')}
                          className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-[10px] transition"
                        >
                          Hủy VIP
                        </button>
                      )}

                      {sub.status === 'CANCELLED' && (
                        <button 
                          onClick={() => handleStatusChange(sub.id, 'ACTIVE')}
                          className="px-2 py-1 bg-[#282a30] hover:bg-[#33343b] text-white rounded text-[10px] transition"
                        >
                          Kích hoạt lại
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: GIAO DỊCH THANH TOÁN (payment_transactions) */}
        {/* ======================================================== */}
        {activeTab === 'payments' && (
          <div className="space-y-2.5">
            <div>
              <h3 className="font-semibold text-white text-[12px]">Lịch sử giao dịch thanh toán VIP</h3>
              <p className="text-[10px] text-[#94a3b8]">Bảng dữ liệu: <code className="text-[#10b981] font-['JetBrains_Mono']">payment_transactions</code></p>
            </div>

            <div className="space-y-1.5">
              {payments.map((p) => (
                <div 
                  key={p.id}
                  className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-['JetBrains_Mono'] font-bold text-white text-[11px]">{p.orderCode}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-['JetBrains_Mono'] bg-white/10 text-[#4cd7f6]">
                        {p.paymentProvider}
                      </span>
                      <span className={`text-[8px] font-['JetBrains_Mono'] px-1.5 py-0.2 rounded font-bold ${
                        p.status === 'SUCCESS' ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30' :
                        p.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="text-[9px] text-[#94a3b8] font-['JetBrains_Mono']">
                      User #{p.userId} • Thời gian: {formatDate(p.paidAt || p.createdAt)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-['JetBrains_Mono'] font-bold text-[12px] text-[#4edea3]">
                      +{formatVND(p.amount)}
                    </div>
                    <div className="text-[9px] text-[#94a3b8]">{p.paymentMethod || 'Online Payment'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: THÊM / CHỈNH SỬA GÓI VIP (vip_plans) */}
      {/* ======================================================== */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#1a1a2e] border border-white/15 rounded-xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-white text-sm">
                {editingPlan ? 'Chỉnh sửa Gói VIP' : 'Tạo Gói VIP Mới'}
              </h3>
              <button 
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 text-[#94a3b8] hover:text-white rounded"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handlePlanSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">Mã gói (plan_code)</label>
                <input 
                  type="text"
                  placeholder="VD: VIP_30_DAYS, VIP_PRO..."
                  value={planForm.planCode}
                  onChange={(e) => setPlanForm({ ...planForm, planCode: e.target.value })}
                  className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white uppercase font-['JetBrains_Mono'] focus:outline-none focus:border-[#c0c1ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">Tên hiển thị (plan_name)</label>
                <input 
                  type="text"
                  placeholder="VD: VIP 30 ngày, Gói Chuyên Nghiệp..."
                  value={planForm.planName}
                  onChange={(e) => setPlanForm({ ...planForm, planName: e.target.value })}
                  className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#c0c1ff]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#94a3b8] mb-0.5">Giá cước (VND)</label>
                  <input 
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="99000"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white font-['JetBrains_Mono'] focus:outline-none focus:border-[#c0c1ff]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#94a3b8] mb-0.5">Thời hạn (ngày)</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="30"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                    className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white font-['JetBrains_Mono'] focus:outline-none focus:border-[#c0c1ff]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">Mô tả gói (description)</label>
                <textarea 
                  rows={2}
                  placeholder="Quyền lợi của gói VIP..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full p-2 bg-[#13131f] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#c0c1ff] resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input 
                  type="checkbox"
                  id="isActiveToggle"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="rounded border-white/10 bg-[#13131f] text-[#c0c1ff]"
                />
                <label htmlFor="isActiveToggle" className="text-white text-[11px] cursor-pointer">
                  Kích hoạt mở bán ngay (is_active)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-3 py-1 bg-[#282a30] hover:bg-[#33343b] text-[#94a3b8] rounded text-xs transition"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-3 py-1 bg-[#c0c1ff] hover:bg-[#8083ff] text-[#1000a9] font-bold rounded text-xs transition"
                >
                  {editingPlan ? 'Lưu thay đổi' : 'Tạo gói VIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CẤP VIP THỦ CÔNG (user_subscriptions) */}
      {/* ======================================================== */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#1a1a2e] border border-white/15 rounded-xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-white text-sm">Cấp Quyền VIP Thủ Công</h3>
              <button 
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 text-[#94a3b8] hover:text-white rounded"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">User ID (app_users.id)</label>
                <input 
                  type="number"
                  placeholder="VD: 1, 2, 3..."
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
                  className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white font-['JetBrains_Mono'] focus:outline-none focus:border-[#4cd7f6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">Tên người dùng (@threads username)</label>
                <input 
                  type="text"
                  placeholder="VD: hoang_tech"
                  value={grantForm.username}
                  onChange={(e) => setGrantForm({ ...grantForm, username: e.target.value })}
                  className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#4cd7f6]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">Chọn Gói VIP (vip_plan_id)</label>
                <select 
                  value={grantForm.vipPlanId}
                  onChange={(e) => setGrantForm({ ...grantForm, vipPlanId: e.target.value })}
                  className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#4cd7f6]"
                  required
                >
                  <option value="">-- Chọn gói cước --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.planName} ({p.planCode}) - {formatVND(p.price)} / {p.durationDays} ngày
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#94a3b8] mb-0.5">Thời hạn tùy chỉnh (ngày) - Để trống nếu dùng mặc định của gói</label>
                <input 
                  type="number"
                  min="1"
                  placeholder="VD: 30, 90..."
                  value={grantForm.customDurationDays}
                  onChange={(e) => setGrantForm({ ...grantForm, customDurationDays: e.target.value })}
                  className="w-full h-7 px-2 bg-[#13131f] border border-white/10 rounded text-xs text-white font-['JetBrains_Mono'] focus:outline-none focus:border-[#4cd7f6]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-3 py-1 bg-[#282a30] hover:bg-[#33343b] text-[#94a3b8] rounded text-xs transition"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-3 py-1 bg-[#4cd7f6] hover:bg-[#38bdf8] text-[#0c0e14] font-bold rounded text-xs transition"
                >
                  Cấp VIP ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
