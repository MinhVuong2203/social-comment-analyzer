import { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  LogOut, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  PieChart,
  Filter,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminDashboardData, 
  getChartAnalysisStats,
  formatCompactNumber, 
  formatCurrency 
} from '../services/adminDashboardService';

// Biểu đồ tròn khuyết SVG (Donut Chart)
function DonutChart({ segments, centerValue, centerLabel, centerColor = '#f1f5f9' }) {
  const r = 40;
  const cx = 50;
  const cy = 50;
  const stroke = 9;
  const circ = 2 * Math.PI * r;
  
  const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;
  let accumulatedPercent = 0;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width="104" height="104" viewBox="0 0 100 100" className="rotate-[-90deg]">
        {/* Track nền mờ */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={r} 
          fill="none" 
          stroke="rgba(255,255,255,0.06)" 
          strokeWidth={stroke} 
        />
        {/* Các dải màu */}
        {segments.map((s, i) => {
          const val = Number(s.value) || 0;
          const pct = val / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const currentOffset = accumulatedPercent;
          accumulatedPercent += pct * 100;

          if (val <= 0) return null;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-(currentOffset / 100) * circ}
              className="transition-all duration-700 ease-out"
            />
          );
        })}
      </svg>
      {/* Nhãn giữa vòng tròn */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1">
        <span className="text-[13px] font-bold font-['Plus_Jakarta_Sans'] leading-none text-white truncate max-w-[65px]" style={{ color: centerColor }}>
          {centerValue}
        </span>
        <span className="text-[8px] text-[#94a3b8] font-medium leading-tight mt-0.5 truncate max-w-[65px]">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Bộ lọc tổng quát phía trên (lọc riêng cho 4 thẻ KPIs và danh sách user)
  const [globalTimeRange, setGlobalTimeRange] = useState('ALL'); // ALL, 30_DAYS, 7_DAYS, TODAY
  const [globalMemberSegment, setGlobalMemberSegment] = useState('ALL'); // ALL, VIP_ONLY, FREE_ONLY

  // Bộ lọc độc lập trong Khối Biểu đồ (hoàn toàn không liên quan đến bộ lọc ở trên)
  const [chartTimeRange, setChartTimeRange] = useState('ALL'); // ALL, 30_DAYS, 7_DAYS
  const [chartTab, setChartTab] = useState('SENTIMENT'); // SENTIMENT, TOXICITY, MEMBERSHIP
  const [chartStats, setChartStats] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    newUsersCount: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    totalCommentsAnalyzed: 0,
    growthRates: null,
    recentUsers: [],
    planDistribution: [],
    planCount: 3,
    sentimentStats: null,
    isBackendConnected: false
  });

  // Tải dữ liệu Dashboard tổng quát theo mốc thời gian lọc ở trên
  const loadDashboardData = async (timeRange = globalTimeRange, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const days = timeRange === 'TODAY' ? 1 
      : timeRange === '7_DAYS' ? 7 
      : timeRange === '30_DAYS' ? 30 
      : null;

    try {
      const data = await getAdminDashboardData({ days });
      setDashboardData(data);
      // Khởi tạo chartStats lần đầu nếu chưa có
      setChartStats(prev => prev || data.sentimentStats);
    } catch (err) {
      console.error("Lỗi tải dữ liệu Admin Dashboard:", err);
      setError("Không thể tải toàn bộ dữ liệu mới nhất. Đang hiển thị bản lưu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tải dữ liệu phân tích cảm xúc / độc hại RIÊNG cho biểu đồ theo mốc thời gian độc lập ở dưới
  const loadChartData = async (timeRange = chartTimeRange) => {
    const days = timeRange === '7_DAYS' ? 7 : timeRange === '30_DAYS' ? 30 : null;
    try {
      const stats = await getChartAnalysisStats(days);
      if (stats) {
        setChartStats(stats);
      }
    } catch (e) {
      console.warn("Lỗi load dữ liệu biểu đồ phân tích:", e);
    }
  };

  // Tải lại toàn bộ dữ liệu thủ công
  const loadData = (isManual = false) => {
    loadDashboardData(globalTimeRange, isManual);
    loadChartData(chartTimeRange);
  };

  // Tự động tải lại khi đổi bộ lọc phía trên
  useEffect(() => {
    loadDashboardData(globalTimeRange);
  }, [globalTimeRange]);

  // Tự động tải lại số liệu biểu đồ khi đổi bộ lọc ở dưới (hoàn toàn độc lập)
  useEffect(() => {
    loadChartData(chartTimeRange);
  }, [chartTimeRange]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_auth');
    navigate('/admin/login');
  };

  const hasActiveGlobalFilters = globalTimeRange !== 'ALL' || globalMemberSegment !== 'ALL';

  const resetGlobalFilters = () => {
    setGlobalTimeRange('ALL');
    setGlobalMemberSegment('ALL');
  };

  // 100% số liệu thực tế từ database, không sử dụng hệ số nhân ảo
  const displayedRevenue = dashboardData.totalRevenue;
  const displayedActiveSubs = globalMemberSegment === 'FREE_ONLY' 
    ? 0 
    : dashboardData.activeSubscriptions;
  const displayedAnalysis = dashboardData.totalCommentsAnalyzed;

  // Tính toán % biến động so với kỳ trước thực tế
  const formatGrowthChange = (rate) => {
    if (rate === null || rate === undefined || globalTimeRange === 'ALL') {
      return { text: 'Toàn kỳ', color: 'text-[#94a3b8]' };
    }
    const r = Math.round(rate);
    if (r > 0) return { text: `+${r}%`, color: 'text-[#4edea3]' };
    if (r < 0) return { text: `${r}%`, color: 'text-[#ff5449]' };
    return { text: '0%', color: 'text-[#94a3b8]' };
  };

  const usersChange = formatGrowthChange(dashboardData.growthRates?.users);
  const subsChange = formatGrowthChange(dashboardData.growthRates?.subscriptions);
  const revenueChange = formatGrowthChange(dashboardData.growthRates?.revenue);
  const commentsChange = formatGrowthChange(dashboardData.growthRates?.comments);

  // Khi chọn Toàn thời gian -> hiển thị Tổng User tích lũy
  // Khi chọn các mốc thời gian khác (30 ngày, 7 ngày, Hôm nay) -> hiển thị User mới đăng ký trong kỳ
  const isAllTime = globalTimeRange === 'ALL';
  const userCardLabel = isAllTime ? 'Tổng User' : 'User mới đăng ký';
  const userCardValue = isAllTime 
    ? formatCompactNumber(dashboardData.totalUsers) 
    : formatCompactNumber(dashboardData.newUsersCount ?? 0);

  // 4 thẻ chỉ số tóm tắt (KPIs) ngoài cùng
  const summaryMetrics = [
    { 
      label: userCardLabel, 
      value: loading ? '...' : userCardValue, 
      change: usersChange.text,
      changeColor: usersChange.color,
    },
    { 
      label: 'Gói Active', 
      value: loading ? '...' : formatCompactNumber(displayedActiveSubs), 
      change: subsChange.text,
      changeColor: subsChange.color,
    },
    { 
      label: 'Doanh thu', 
      value: loading ? '...' : formatCurrency(displayedRevenue), 
      change: revenueChange.text,
      changeColor: revenueChange.color,
    },
    { 
      label: 'Lượt PhoBERT', 
      value: loading ? '...' : formatCompactNumber(displayedAnalysis), 
      change: commentsChange.text,
      changeColor: commentsChange.color,
    }
  ];

  // Lọc danh sách user mới nhất theo phân khúc của bộ lọc trên
  const filteredRecentUsers = dashboardData.recentUsers.filter(u => {
    if (globalMemberSegment === 'VIP_ONLY') return u.plan !== 'FREE';
    if (globalMemberSegment === 'FREE_ONLY') return u.plan === 'FREE';
    return true;
  });

  // Cấu hình dữ liệu cho Biểu đồ Tròn (Donut Chart) - 100% số liệu thực tế từ database
  let chartSegments = [];
  let centerVal = '';
  let centerLbl = '';
  let centerCol = '#f1f5f9';

  const sStats = chartStats || dashboardData.sentimentStats;

  if (chartTab === 'SENTIMENT' && sStats) {
    const pos = sStats.positive || 0;
    const neu = sStats.neutral || 0;
    const neg = sStats.negative || 0;
    const sum = pos + neu + neg || 1;

    chartSegments = [
      { name: 'Tích cực', value: pos, color: '#4edea3', icon: '😊', percent: Math.round((pos / sum) * 100) },
      { name: 'Trung tính', value: neu, color: '#c0c1ff', icon: '😐', percent: Math.round((neu / sum) * 100) },
      { name: 'Tiêu cực', value: neg, color: '#ffb4ab', icon: '😡', percent: Math.round((neg / sum) * 100) },
    ];
    centerVal = `${chartSegments[0].percent}%`;
    centerLbl = 'Tích cực';
    centerCol = '#4edea3';
  } else if (chartTab === 'TOXICITY' && sStats) {
    const cln = sStats.clean || 0;
    const off = sStats.offensive || 0;
    const hte = sStats.hate || 0;
    const sum = cln + off + hte || 1;

    chartSegments = [
      { name: 'Lành tính', value: cln, color: '#4edea3', percent: Math.round((cln / sum) * 100) },
      { name: 'Xúc phạm', value: off, color: '#f59e0b', percent: Math.round((off / sum) * 100) },
      { name: 'Thù ghét', value: hte, color: '#ff5449', percent: Math.round((hte / sum) * 100) },
    ];
    centerVal = `${chartSegments[0].percent}%`;
    centerLbl = 'Lành tính';
    centerCol = '#4edea3';
  } else {
    // MEMBERSHIP
    const totalDistUsers = dashboardData.planDistribution.reduce((sum, p) => sum + (Number(p.users) || 0), 0) || 1;
    chartSegments = dashboardData.planDistribution.map(p => ({
      name: p.name,
      value: p.users,
      color: p.color,
      percent: Math.round((p.users / totalDistUsers) * 100)
    }));
    centerVal = `${formatCompactNumber(dashboardData.activeSubscriptions)}`;
    centerLbl = 'Gói Active';
    centerCol = '#c0c1ff';
  }

  const currentChartComments = (chartTab === 'MEMBERSHIP')
    ? dashboardData.totalUsers
    : chartSegments.reduce((sum, s) => sum + (Number(s.value) || 0), 0);

  const currentChartPosts = (sStats?.totalPosts !== undefined && sStats?.totalPosts !== null)
    ? sStats.totalPosts
    : (chartTab === 'MEMBERSHIP' ? 1 : 0);

  const totalDistributionUsers = dashboardData.planDistribution.reduce(
    (sum, p) => sum + (Number(p.users) || 0), 
    0
  ) || dashboardData.totalUsers || 1;

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
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8 max-w-4xl mx-auto w-full">
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

        {/* Thanh Bộ Lọc Tổng Quát (Lọc cho KPIs và User, hoàn toàn độc lập với Biểu đồ ở dưới) */}
        <div className="bg-[#1a1a2e]/90 border border-white/10 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#94a3b8] flex items-center space-x-1 mr-1">
              <Filter size={11} />
              <span>Lọc số liệu:</span>
            </span>

            {/* Lọc Mốc Thời Gian KPIs */}
            <select
              value={globalTimeRange}
              onChange={(e) => setGlobalTimeRange(e.target.value)}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#4cd7f6]"
            >
              <option value="ALL">Toàn thời gian</option>
              <option value="30_DAYS">30 ngày qua</option>
              <option value="7_DAYS">7 ngày qua</option>
              <option value="TODAY">Hôm nay</option>
            </select>

            {/* Lọc Phân Khúc Hội Viên */}
            <select
              value={globalMemberSegment}
              onChange={(e) => setGlobalMemberSegment(e.target.value)}
              className="bg-[#121221] border border-white/10 text-white rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#c0c1ff]"
            >
              <option value="ALL">Tất cả hội viên</option>
              <option value="VIP_ONLY">👑 Chỉ hội viên VIP</option>
              <option value="FREE_ONLY">Chỉ hội viên Free</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-['JetBrains_Mono'] text-[#94a3b8]">
              {globalTimeRange === 'TODAY' ? 'Số liệu 24h' : globalTimeRange === '7_DAYS' ? 'Số liệu tuần' : 'Tổng tích lũy'}
            </span>

            {hasActiveGlobalFilters && (
              <button
                onClick={resetGlobalFilters}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#4cd7f6] hover:text-white border border-white/10 transition text-[10px] flex items-center space-x-1"
                title="Khôi phục mặc định"
              >
                <RotateCcw size={10} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid 4 chỉ số tóm tắt (2x2) */}
        <div className="grid grid-cols-2 gap-2">
          {summaryMetrics.map((item, idx) => (
            <div 
              key={idx}
              className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between shadow-xs hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between text-[#94a3b8]">
                <span className="text-[10px]">{item.label}</span>
                <span className={`text-[9px] font-['JetBrains_Mono'] font-semibold ${item.changeColor || 'text-[#4edea3]'}`}>
                  {item.change}
                </span>
              </div>
              <div className="font-['Plus_Jakarta_Sans'] text-base font-bold text-white mt-1">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Khối Biểu Đồ Hình Tròn (Donut Chart) & Tỷ Lệ */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-2.5">
          {/* Header với Tabs chuyển đổi chế độ xem biểu đồ */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 flex-wrap gap-2">
            <div className="flex items-center space-x-1.5">
              <PieChart size={13} className="text-[#4cd7f6]" />
              <span className="font-semibold text-[11px] text-[#f1f5f9]">
                Biểu đồ Phân tích Hệ thống
              </span>
            </div>

            {/* Tabs chuyển đổi */}
            <div className="flex items-center bg-[#121221] p-0.5 rounded-lg border border-white/10 text-[10px]">
              <button
                onClick={() => setChartTab('SENTIMENT')}
                className={`px-2 py-0.5 rounded transition font-medium ${
                  chartTab === 'SENTIMENT' 
                    ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] font-semibold' 
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Cảm xúc
              </button>
              <button
                onClick={() => setChartTab('TOXICITY')}
                className={`px-2 py-0.5 rounded transition font-medium ${
                  chartTab === 'TOXICITY' 
                    ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] font-semibold' 
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Độ độc hại
              </button>
              <button
                onClick={() => setChartTab('MEMBERSHIP')}
                className={`px-2 py-0.5 rounded transition font-medium ${
                  chartTab === 'MEMBERSHIP' 
                    ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] font-semibold' 
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Gói VIP
              </button>
            </div>
          </div>

          {/* Dải thông tin ngữ cảnh thời gian & số lượng bài viết / comment */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#121221] px-2.5 py-1.5 rounded-lg border border-white/5 font-['JetBrains_Mono'] text-[10px]">
            <div className="flex items-center space-x-2 text-[#94a3b8] flex-wrap">
              {chartTab !== 'MEMBERSHIP' ? (
                <>
                  <span className="text-white">
                    <strong>{currentChartComments.toLocaleString('vi-VN')}</strong> bình luận
                  </span>
                  <span>•</span>
                  <span className="text-white">
                    trên <strong>{currentChartPosts}</strong> bài viết
                  </span>
                  <span>•</span>
                  <span className="text-[#4edea3]">
                    ~{(currentChartComments / (currentChartPosts || 1)).toFixed(0)} cmt/bài
                  </span>
                </>
              ) : (
                <span className="text-white">
                  Tổng <strong>{dashboardData.totalUsers.toLocaleString('vi-VN')}</strong> người dùng đăng ký
                </span>
              )}
            </div>

            {/* Dropdown chọn mốc thời gian CHỈ lọc cho riêng Khối Biểu đồ này */}
            <select
              value={chartTimeRange}
              onChange={(e) => setChartTimeRange(e.target.value)}
              className="bg-[#0f172a] text-[#4cd7f6] border border-[#4cd7f6]/40 hover:border-[#4cd7f6] rounded px-2 py-0.5 text-[10px] font-['JetBrains_Mono'] focus:outline-none cursor-pointer transition shadow-xs"
              title="Chọn khoảng thời gian phân tích biểu đồ"
            >
              <option value="ALL" className="bg-[#181829] text-white">Toàn bộ thời gian</option>
              <option value="30_DAYS" className="bg-[#181829] text-white">30 ngày qua</option>
              <option value="7_DAYS" className="bg-[#181829] text-white">7 ngày qua</option>
            </select>
          </div>

          {/* Nội dung Biểu đồ tròn + Chú giải (Legend) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 pt-1">
            {/* Vòng tròn Donut SVG */}
            <DonutChart 
              segments={chartSegments} 
              centerValue={centerVal} 
              centerLabel={centerLbl} 
              centerColor={centerCol}
            />

            {/* Danh sách Chú giải & Thanh tỷ lệ */}
            <div className="flex-1 w-full space-y-1.5">
              {chartSegments.map((s, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center space-x-1.5 text-white/90">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.icon && <span className="text-[12px]">{s.icon}</span>}
                      <span>{s.name}</span>
                    </span>
                    <span className="font-['JetBrains_Mono'] text-white">
                      {formatCompactNumber(s.value)} <span className="text-[#94a3b8]">({s.percent}%)</span>
                    </span>
                  </div>
                  {/* Thanh mini bar */}
                  <div className="w-full bg-[#0d0d14] h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.percent}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  Xem danh sách {loading ? '...' : formatCompactNumber(dashboardData.totalUsers)} user & tài khoản Threads
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
                  Cấu hình {dashboardData.planCount} gói (Free, VIP 30 ngày, VIP 90 ngày,...)
                </div>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#94a3b8] group-hover:text-[#c0c1ff] group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* Bảng mini: User mới nhất */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-[11px] text-[#f1f5f9]">User đăng ký mới nhất</span>
              {globalMemberSegment !== 'ALL' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-['JetBrains_Mono'] bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30">
                  {globalMemberSegment === 'VIP_ONLY' ? 'Chỉ VIP' : 'Chỉ Free'}
                </span>
              )}
            </div>
            <button 
              onClick={() => navigate('/admin/users')}
              className="text-[10px] text-[#4cd7f6] hover:underline"
            >
              Xem hết →
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {filteredRecentUsers && filteredRecentUsers.length > 0 ? (
              filteredRecentUsers.map((u) => (
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
              ))
            ) : (
              <div className="py-3 text-center text-[#94a3b8] text-[10px]">
                Không có người dùng nào khớp phân khúc đã chọn.
              </div>
            )}
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
