import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockReplies, mockPosts } from '../utils/mockData';
import ReplyCard, { checkThresholdExceeded, getHateSpeechInfo } from '../components/comments/ReplyCard';
import { apiService } from '../services/apiService';
import { getUserSettings, getLocalUserSettings } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/Comment.css';

const SORT_OPTIONS = ['Newest', 'Oldest', 'Most Toxic', 'Positive', 'Negative'];
const SORT_LABELS = {
  'Newest': 'Mới nhất',
  'Oldest': 'Cũ nhất',
  'Most Toxic': 'Độc hại nhất',
  'Positive': 'Tích cực nhất',
  'Negative': 'Tiêu cực nhất',
};

// ── Định dạng khoảng thời gian bình luận (relative time: "X phút trước", "Hôm qua lúc...") ──
export function formatCommentTime(rawTimestamp) {
  if (!rawTimestamp) return 'Gần đây';
  const date = new Date(rawTimestamp);
  if (isNaN(date.getTime())) return String(rawTimestamp);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay === 1) return `Hôm qua lúc ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Lấy mốc thời gian dạng số (timestamp epoch ms) chuẩn xác để sắp xếp ──
export function getCommentTimestamp(item) {
  if (!item) return 0;
  const raw = item.timestamp || item.threadsTimestamp || item.createdAt;
  if (raw) {
    const t = new Date(raw).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.time && typeof item.time === 'string') {
    const t = new Date(item.time).getTime();
    if (!isNaN(t) && t > 0) return t;

    const minMatch = item.time.match(/(\d+)\s*phút/);
    if (minMatch) return Date.now() - parseInt(minMatch[1], 10) * 60 * 1000;
    const hourMatch = item.time.match(/(\d+)\s*giờ/);
    if (hourMatch) return Date.now() - parseInt(hourMatch[1], 10) * 3600 * 1000;
    const dayMatch = item.time.match(/(\d+)\s*ngày/);
    if (dayMatch) return Date.now() - parseInt(dayMatch[1], 10) * 86400 * 1000;
  }
  const n = Number(item.id);
  if (!isNaN(n)) return n;
  return 0;
}

export default function CommentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Ngưỡng cảnh báo lấy từ Cài đặt (SettingsPage) ──
  const [thresholds, setThresholds] = useState(() => getLocalUserSettings());

  // ── Posts state ──
  const [posts,            setPosts]          = useState(mockPosts);
  const [selectedPostId,   setSelectedPostId] = useState(mockPosts[0]?.id || null);
  const [isLoadingPosts,   setIsLoadingPosts] = useState(false);
  const [isLoadingComments,setIsLoadingComments]= useState(false);

  // ── Comments / Replies state ──
  const [replies,        setReplies]     = useState(mockReplies);
  const [search,         setSearch]      = useState('');
  const [activeFilter,   setFilter]      = useState('all');
  const [sort,           setSort]        = useState('Newest');
  const [showSortMenu,   setShowSort]    = useState(false);
  const [showNewBanner,  setShowNew]     = useState(true);
  const [isAnalyzing,    setIsAnalyzing] = useState(false);
  const [analyzingId,    setAnalyzingId] = useState(null);
  const [statusMsg,      setStatusMsg]   = useState('');
  const [isMockMode,     setIsMockMode]  = useState(false);

  // ── Đồng bộ cài đặt ngưỡng cảnh báo từ SettingsPage (qua API và event) ──
  useEffect(() => {
    let mounted = true;

    getUserSettings().then(data => {
      if (mounted && data) {
        setThresholds({
          toxicThreshold: data.toxicThreshold ?? 50,
          hateThreshold: data.hateThreshold ?? 50,
          sentimentThreshold: data.sentimentThreshold ?? 50,
          theme: data.theme || 'dark',
        });
      }
    });

    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setThresholds(prev => ({ ...prev, ...e.detail }));
      } else {
        setThresholds(getLocalUserSettings());
      }
    };

    window.addEventListener('app-settings-updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('app-settings-updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, []);

  // ── Nạp danh sách bài viết từ Backend (Threads API) ──
  useEffect(() => {
    async function fetchPosts() {
      setIsLoadingPosts(true);
      try {
        const realPosts = await apiService.getPosts();
        if (realPosts && Array.isArray(realPosts) && realPosts.length > 0) {
          const formattedPosts = realPosts.map(p => ({
            id: p.id,
            username: `@${user?.username || 'me'}`,
            time: p.timestamp ? new Date(p.timestamp).toLocaleDateString('vi-VN') : 'Gần đây',
            text: p.text || 'Bài viết không có nội dung chữ',
            totalReplies: p.totalReplies || 0,
            analyzed: p.analyzed || false,
          }));
          setPosts(formattedPosts);
          setSelectedPostId(formattedPosts[0].id);
          setIsMockMode(false);
        } else {
          setIsMockMode(true);
        }
      } catch (err) {
        console.warn('Chưa kết nối được Threads API, kích hoạt chế độ mẫu thử nghiệm:', err);
        setIsMockMode(true);
      } finally {
        setIsLoadingPosts(false);
      }
    }

    fetchPosts();
  }, [user]);

  // ── Nạp bình luận và toàn bộ reply khi chuyển bài viết ──
  useEffect(() => {
    if (!selectedPostId) return;

    // Nếu đang là bài viết mock mẫu thì nạp mockReplies
    if (String(selectedPostId).startsWith('post_') || isMockMode) {
      setReplies(mockReplies);
      return;
    }

    async function fetchComments() {
      setIsLoadingComments(true);
      setStatusMsg('Đang lấy bình luận và các câu trả lời từ Threads API (/conversation)...');
      try {
        const res = await apiService.getPostComments(selectedPostId);
        if (res && res.comments && Array.isArray(res.comments)) {
          if (res.comments.length === 0) {
            setReplies([]);
            setStatusMsg('Bài viết chưa có bình luận nào trên Threads.');
          } else {
            const mapped = res.comments.map(c => {
              const hasPrediction = Boolean(c.toxicity && c.toxicity.label);
              const toxLabel = c.toxicity?.label || 'NON-TOXIC';
              const hateObj = c.hate_speech || c.hateSpeech;
              
              // Chuẩn hóa nhãn Hate Speech: CLEAN / OFFENSIVE / HATE
              const rawHate = (hateObj?.label || 'CLEAN').toUpperCase();
              let hateLabel = 'CLEAN';
              if (rawHate.includes('HATE')) hateLabel = 'HATE';
              else if (rawHate.includes('OFFENSIVE')) hateLabel = 'OFFENSIVE';
              else hateLabel = 'CLEAN';

              const sentLabel = (c.sentiment?.label || 'NEUTRAL').toLowerCase();

              const toxVal = toxLabel === 'TOXIC'
                ? Math.round((c.toxicity?.confidence || 0.9) * 100)
                : Math.max(1, Math.round(((c.toxicity?.probabilities?.TOXIC || (1 - (c.toxicity?.confidence || 0.95)))) * 100));

              // Độ tin cậy cho Hate Speech
              const hateScore = Math.round((hateObj?.confidence || 0.9) * 100);
              const hateVal = hateLabel === 'HATE'
                ? hateScore
                : (hateLabel === 'OFFENSIVE' ? hateScore : 0);

              const sentConf = Math.round((c.sentiment?.confidence || 0.9) * 100);

              return {
                id: c.id,
                parentId: c.parentId || null,
                isReply: Boolean(c.isReply || c.parentId),
                replyToUser: c.replyToUser || null,
                username: `@${c.username || 'threads_user'}`,
                avatar: c.profile_picture_url || c.profilePictureUrl || null,
                profilePicture: c.profile_picture_url || c.profilePictureUrl || null,
                profile_picture_url: c.profile_picture_url || c.profilePictureUrl || null,
                time: formatCommentTime(c.timestamp),
                timestamp: c.timestamp || null,
                formattedTime: c.timestamp ? new Date(c.timestamp).toLocaleString('vi-VN') : 'Gần đây',
                content: c.text,
                sentiment: hasPrediction ? sentLabel : 'unprocessed',
                sentimentScore: hasPrediction ? sentConf : 0,
                toxicity: hasPrediction ? toxVal : null,
                hate: hasPrediction ? hateVal : null,
                hateLabel: hasPrediction ? hateLabel : null,
                hateScore: hasPrediction ? hateScore : null,
                confidence: hasPrediction ? sentConf : null,
                flagged: hasPrediction ? (toxLabel === 'TOXIC' || hateLabel === 'HATE' || toxVal >= 60) : false,
                violating: hasPrediction ? (hateLabel === 'HATE') : false,
                toxicityLevel: hasPrediction ? (toxVal >= 60 ? 'High' : (toxVal >= 20 ? 'Medium' : 'Low')) : 'Pending',
                analyzed: hasPrediction,
                likes: 0,
                replies: 0,
                rawPrediction: hasPrediction ? {
                  toxicity: c.toxicity,
                  hate_speech: hateObj,
                  sentiment: c.sentiment,
                } : null,
              };
            });
            setReplies(mapped);
            setStatusMsg(`✓ Đã nạp ${mapped.length} bình luận & phản hồi từ Threads.`);
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy comments từ backend, fallback sang mock:', err);
        setReplies(mockReplies);
      } finally {
        setIsLoadingComments(false);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    }

    fetchComments();
  }, [selectedPostId, isMockMode]);

  // Bài viết hiện tại đang được chọn
  const selectedPost = useMemo(() => {
    return posts.find(p => String(p.id) === String(selectedPostId)) || posts[0];
  }, [posts, selectedPostId]);

  // ── Xây dựng cấu trúc cây phân cấp (Top-level comments & All nested child replies) ──
  const { topLevelItems, totalTopLevel, totalChildReplies } = useMemo(() => {
    if (!replies || replies.length === 0) {
      return { topLevelItems: [], totalTopLevel: 0, totalChildReplies: 0 };
    }

    // 1. Tạo node clone cho mỗi reply với mảng children rỗng
    const itemMap = new Map();
    replies.forEach(r => {
      const idStr = String(r.id).trim();
      itemMap.set(idStr, {
        ...r,
        children: [],
      });
    });

    // 2. Kết nối cha - con cho mọi cấp độ (cấp 1, reply cấp 2, reply của reply cấp 3...)
    const roots = [];
    const rootPostIdStr = selectedPostId ? String(selectedPostId).trim() : null;

    itemMap.forEach(item => {
      const pId = item.parentId ? String(item.parentId).trim() : null;
      const isParentInList = pId && itemMap.has(pId);
      const isReplyToRootPost = !pId || (rootPostIdStr && pId === rootPostIdStr);

      if (isParentInList && !isReplyToRootPost && pId !== String(item.id).trim()) {
        const parentNode = itemMap.get(pId);
        if (!item.replyToUser && parentNode.username) {
          item.replyToUser = parentNode.username;
        }
        item.isReply = true;
        parentNode.children.push(item);
      } else {
        item.isReply = false;
        roots.push(item);
      }
    });

    // 3. Sắp xếp các reply con trong từng luồng theo thứ tự thời gian tăng dần
    function sortThreadReplies(children) {
      children.sort((a, b) => getCommentTimestamp(a) - getCommentTimestamp(b));
      children.forEach(child => {
        if (child.children && child.children.length > 0) {
          sortThreadReplies(child.children);
        }
      });
    }

    roots.forEach(root => {
      if (root.children && root.children.length > 0) {
        sortThreadReplies(root.children);
      }
    });

    const totalTop = roots.length;
    const totalChild = replies.length - totalTop;

    return {
      topLevelItems: roots,
      totalTopLevel: totalTop,
      totalChildReplies: totalChild,
    };
  }, [replies, selectedPostId]);

  // ── Stats calculation (Tổng hợp các chỉ số và phát hiện vượt ngưỡng cài đặt) ──
  const stats = useMemo(() => {
    const analyzedList = replies.filter(r => r.analyzed);
    const posCount = analyzedList.filter(r => r.sentiment === 'positive').length;
    const neuCount = analyzedList.filter(r => r.sentiment === 'neutral').length;
    const negCount = analyzedList.filter(r => r.sentiment === 'negative').length;
    const toxCount = analyzedList.filter(r => (r.toxicity || 0) >= (thresholds.toxicThreshold || 50) || r.toxicityLevel === 'High').length;
    const unprocCount = replies.filter(r => !r.analyzed).length;

    let cleanCount = 0;
    let offensiveCount = 0;
    let hateCount = 0;
    let exceededCount = 0;

    analyzedList.forEach(r => {
      const h = getHateSpeechInfo(r);
      if (h.key === 'HATE') hateCount++;
      else if (h.key === 'OFFENSIVE') offensiveCount++;
      else cleanCount++;

      if (checkThresholdExceeded(r, thresholds).isExceeded) {
        exceededCount++;
      }
    });

    return {
      posCount,
      neuCount,
      negCount,
      toxCount,
      unprocCount,
      cleanCount,
      offensiveCount,
      hateCount,
      exceededCount,
    };
  }, [replies, thresholds]);

  // ── Dynamic Filters based on real comments state & settings ──
  const dynamicFilters = useMemo(() => {
    const total = replies.length;
    const unproc = stats.unprocCount;
    const pos = stats.posCount;
    const neu = stats.neuCount;
    const neg = stats.negCount;
    const exceeded = stats.exceededCount;
    
    const filters = [
      { id: 'all', label: 'Tất cả', count: total },
    ];

    // Nút lọc nhanh bình luận VƯỢT NGƯỠNG
    if (exceeded > 0) {
      filters.push({ id: 'exceeded', label: 'Vượt ngưỡng', count: exceeded, isExceeded: true });
    }

    if (unproc > 0) {
      filters.push({ id: 'unprocessed', label: 'Chưa phân tích', count: unproc });
    }

    filters.push(
      { id: 'positive', label: 'Tích cực', count: pos },
      { id: 'neutral',  label: 'Trung tính', count: neu },
      { id: 'negative', label: 'Tiêu cực', count: neg },
      { id: 'clean', label: 'Clean', count: stats.cleanCount },
      { id: 'offensive', label: 'Offensive', count: stats.offensiveCount },
      { id: 'hate', label: 'Hate', count: stats.hateCount }
    );
    return filters;
  }, [replies, stats]);

  // ── Lọc và sắp xếp theo cây phân cấp (Hierarchical Filtering & Sorting) ──
  const displayItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matchesFilter = (item) => {
      if (activeFilter === 'exceeded') {
        if (!checkThresholdExceeded(item, thresholds).isExceeded) return false;
      } else if (activeFilter === 'clean') {
        if (!item.analyzed || getHateSpeechInfo(item).key !== 'CLEAN') return false;
      } else if (activeFilter === 'offensive') {
        if (!item.analyzed || getHateSpeechInfo(item).key !== 'OFFENSIVE') return false;
      } else if (activeFilter === 'hate') {
        if (!item.analyzed || getHateSpeechInfo(item).key !== 'HATE') return false;
      } else if (activeFilter === 'unprocessed') {
        if (item.analyzed && item.sentiment !== 'unprocessed') return false;
      } else if (activeFilter !== 'all') {
        if (!item.analyzed || item.sentiment !== activeFilter) return false;
      }
      if (q) {
        const textMatch = (item.content || '').toLowerCase().includes(q);
        const userMatch = (item.username || '').toLowerCase().includes(q);
        return textMatch || userMatch;
      }
      return true;
    };

    function hasMatchingDescendant(node) {
      if (matchesFilter(node)) return true;
      if (node.children && node.children.length > 0) {
        return node.children.some(child => hasMatchingDescendant(child));
      }
      return false;
    }

    let list = [...topLevelItems];

    // Sắp xếp các comment cấp 1 chuẩn xác theo mốc thời gian hoặc tiêu chí chọn
    if (sort === 'Most Toxic') {
      list.sort((a, b) => (b.toxicity || 0) - (a.toxicity || 0));
    } else if (sort === 'Positive') {
      list.sort((a, b) => (b.sentiment === 'positive' ? 1 : 0) - (a.sentiment === 'positive' ? 1 : 0));
    } else if (sort === 'Negative') {
      list.sort((a, b) => (b.sentiment === 'negative' ? 1 : 0) - (a.sentiment === 'negative' ? 1 : 0));
    } else if (sort === 'Oldest') {
      list.sort((a, b) => getCommentTimestamp(a) - getCommentTimestamp(b));
    } else {
      list.sort((a, b) => getCommentTimestamp(b) - getCommentTimestamp(a));
    }

    if (activeFilter === 'all' && !q) {
      return list;
    }

    return list.filter(hasMatchingDescendant);
  }, [topLevelItems, activeFilter, search, sort, thresholds]);

  // ── Phân tích TẤT CẢ bình luận & replies trong bài viết ──
  const handleAnalyzeAll = async () => {
    if (isAnalyzing || replies.length === 0) return;
    setIsAnalyzing(true);
    setStatusMsg(`Đang kết nối PhoBERT phân tích toàn bộ ${replies.length} bình luận & phản hồi...`);

    try {
      let analysisDone = false;

      // 1. Thử gọi phân tích toàn bộ bài viết qua Spring Boot nếu có ID thật
      if (selectedPostId && !String(selectedPostId).startsWith('post_')) {
        try {
          const res = await apiService.analyzePost(selectedPostId);
          if (res && res.comments && res.comments.length > 0) {
            const mapped = res.comments.map(c => {
              const toxLabel = c.toxicity?.label || 'NON-TOXIC';
              const hateObj = c.hate_speech || c.hateSpeech;
              
              const rawHate = (hateObj?.label || 'CLEAN').toUpperCase();
              let hateLabel = 'CLEAN';
              if (rawHate.includes('HATE')) hateLabel = 'HATE';
              else if (rawHate.includes('OFFENSIVE')) hateLabel = 'OFFENSIVE';
              else hateLabel = 'CLEAN';

              const toxVal = toxLabel === 'TOXIC' ? Math.round((c.toxicity?.confidence || 0.9) * 100) : 5;
              const hateScore = Math.round((hateObj?.confidence || 0.9) * 100);
              const hateVal = hateLabel === 'HATE' ? hateScore : (hateLabel === 'OFFENSIVE' ? hateScore : 0);
              const sentConf = Math.round((c.sentiment?.confidence || 0.95) * 100);

              return {
                id: c.id,
                parentId: c.parentId || null,
                isReply: Boolean(c.isReply || c.parentId),
                replyToUser: c.replyToUser || null,
                username: `@${c.username || 'threads_user'}`,
                avatar: c.profile_picture_url || c.profilePictureUrl || null,
                profilePicture: c.profile_picture_url || c.profilePictureUrl || null,
                profile_picture_url: c.profile_picture_url || c.profilePictureUrl || null,
                time: formatCommentTime(c.timestamp),
                timestamp: c.timestamp || null,
                formattedTime: c.timestamp ? new Date(c.timestamp).toLocaleString('vi-VN') : 'Gần đây',
                content: c.text,
                sentiment: (c.sentiment?.label || 'NEUTRAL').toLowerCase(),
                sentimentScore: sentConf,
                toxicity: toxVal,
                hate: hateVal,
                hateLabel: hateLabel,
                hateScore: hateScore,
                confidence: sentConf,
                flagged: toxLabel === 'TOXIC' || hateLabel === 'HATE' || toxVal >= 60,
                violating: hateLabel === 'HATE',
                toxicityLevel: toxLabel === 'TOXIC' ? 'High' : 'Low',
                analyzed: true,
                likes: 0,
                replies: 0,
                rawPrediction: {
                  toxicity: c.toxicity,
                  hate_speech: hateObj,
                  sentiment: c.sentiment,
                },
              };
            });
            setReplies(mapped);
            analysisDone = true;
          }
        } catch (postErr) {
          console.warn('Lỗi gọi analyzePost, chuyển sang predictBatch:', postErr);
        }
      }

      // 2. Nếu chưa xong, gọi predictBatch trực tiếp (hỗ trợ cả Spring Boot và FastAPI)
      if (!analysisDone) {
        const payload = replies.map(r => ({
          id: String(r.id),
          text: r.content,
        }));

        let apiResponse = null;
        try {
          apiResponse = await apiService.predictBatch(payload);
        } catch (err) {
          console.warn('Dịch vụ AI chưa sẵn sàng hoặc offline:', err);
        }

        if (apiResponse && apiResponse.predictions && apiResponse.predictions.length > 0) {
          const predMap = new Map();
          apiResponse.predictions.forEach(p => predMap.set(String(p.id), p));

          setReplies(prev => prev.map(r => {
            const p = predMap.get(String(r.id));
            if (!p) return r;

            const sentLabel = (p.sentiment?.label || 'NEUTRAL').toLowerCase();
            const toxLabel  = p.toxicity?.label || 'NON-TOXIC';
            const hateObj   = p.hate_speech || p.hateSpeech;
            
            const rawHate = (hateObj?.label || 'CLEAN').toUpperCase();
            let hateLabel = 'CLEAN';
            if (rawHate.includes('HATE')) hateLabel = 'HATE';
            else if (rawHate.includes('OFFENSIVE')) hateLabel = 'OFFENSIVE';
            else hateLabel = 'CLEAN';

            const toxVal = toxLabel === 'TOXIC'
              ? Math.round(p.toxicity.confidence * 100)
              : Math.max(1, Math.round(((p.toxicity.probabilities?.TOXIC || (1 - p.toxicity.confidence))) * 100));

            const hateScore = Math.round((hateObj?.confidence || 0.9) * 100);
            const hateVal = hateLabel === 'HATE'
              ? hateScore
              : (hateLabel === 'OFFENSIVE' ? hateScore : Math.max(0, Math.round(((hateObj?.probabilities?.HATE || 0)) * 100)));

            const sentConf = Math.round((p.sentiment?.confidence || 0.95) * 100);
            const avgConf = Math.round(((p.toxicity.confidence + (hateObj?.confidence || 0.95) + p.sentiment.confidence) / 3) * 100);

            return {
              ...r,
              sentiment: sentLabel,
              sentimentScore: sentConf,
              toxicity: toxVal,
              hate: hateVal,
              hateLabel: hateLabel,
              hateScore: hateScore,
              confidence: avgConf,
              flagged: toxLabel === 'TOXIC' || hateLabel === 'HATE' || toxVal >= 60,
              violating: hateLabel === 'HATE',
              toxicityLevel: toxVal >= 60 ? 'High' : (toxVal >= 20 ? 'Medium' : 'Low'),
              analyzed: true,
              rawPrediction: p,
            };
          }));
        } else {
          setStatusMsg('⚠️ Không thể kết nối AI Service để phân tích. Hãy khởi động FastAPI trên cổng 8000.');
          return;
        }
      }

      // Đánh dấu bài viết đã phân tích
      setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, analyzed: true } : p));
      setShowNewBanner(false);
      setStatusMsg(`✓ Đã phân tích thành công toàn bộ ${replies.length} bình luận & phản hồi bằng PhoBERT!`);
    } catch (e) {
      console.error(e);
      setStatusMsg('Có lỗi xảy ra trong quá trình phân tích.');
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setStatusMsg(''), 4500);
    }
  };

  // ── Phân tích 1 bình luận hoặc reply riêng lẻ ──
  const handleAnalyzeSingle = async (replyId) => {
    const target = replies.find(r => r.id === replyId);
    if (!target) return;

    setAnalyzingId(replyId);
    setStatusMsg(`Đang phân tích phản hồi của ${target.username} bằng PhoBERT...`);

    try {
      let pred = null;
      try {
        pred = await apiService.predictSingle(target.content);
      } catch (err) {
        console.warn('Backend API / AI Service error:', err);
      }

      if (pred) {
        const sentLabel = (pred.sentiment?.label || 'NEUTRAL').toLowerCase();
        const toxLabel  = pred.toxicity?.label || 'NON-TOXIC';
        const hateObj   = pred.hate_speech || pred.hateSpeech;
        
        const rawHate = (hateObj?.label || 'CLEAN').toUpperCase();
        let hateLabel = 'CLEAN';
        if (rawHate.includes('HATE')) hateLabel = 'HATE';
        else if (rawHate.includes('OFFENSIVE')) hateLabel = 'OFFENSIVE';
        else hateLabel = 'CLEAN';

        const toxVal = toxLabel === 'TOXIC'
          ? Math.round(pred.toxicity.confidence * 100)
          : Math.max(1, Math.round(((pred.toxicity.probabilities?.TOXIC || (1 - pred.toxicity.confidence))) * 100));

        const hateScore = Math.round((hateObj?.confidence || 0.9) * 100);
        const hateVal = hateLabel === 'HATE'
          ? hateScore
          : (hateLabel === 'OFFENSIVE' ? hateScore : Math.max(0, Math.round(((hateObj?.probabilities?.HATE || 0)) * 100)));

        const sentConf = Math.round((pred.sentiment?.confidence || 0.95) * 100);
        const avgConf = Math.round(((pred.toxicity.confidence + (hateObj?.confidence || 0.95) + pred.sentiment.confidence) / 3) * 100);

        setReplies(prev => prev.map(r => r.id === replyId ? {
          ...r,
          sentiment: sentLabel,
          sentimentScore: sentConf,
          toxicity: toxVal,
          hate: hateVal,
          hateLabel: hateLabel,
          hateScore: hateScore,
          confidence: avgConf,
          flagged: toxLabel === 'TOXIC' || hateLabel === 'HATE' || toxVal >= 60,
          violating: hateLabel === 'HATE',
          toxicityLevel: toxVal >= 60 ? 'High' : (toxVal >= 20 ? 'Medium' : 'Low'),
          analyzed: true,
          rawPrediction: pred,
        } : r));

        setStatusMsg(`Đã phân tích xong: [Toxicity: ${toxLabel} (${toxVal}%), Hate: ${hateLabel} (${hateScore}%), Sắc thái: ${sentLabel.toUpperCase()}]`);
      } else {
        setStatusMsg('Không thể phân tích: Không kết nối được tới PhoBERT AI Service (cổng 8000).');
      }
    } catch (e) {
      console.error(e);
      setStatusMsg('Lỗi khi phân tích phản hồi.');
    } finally {
      setAnalyzingId(null);
      setTimeout(() => setStatusMsg(''), 4500);
    }
  };

  return (
    <div className="ct-page">

      {/* Header */}
      <div className="ct-header">
        <div className="ct-title-row">
          <div className="ct-title-left">
            <h2 className="ct-title">
              Bình luận <span className="ct-live-badge">{replies.length} Tổng</span>
            </h2>
            <span className="ct-model-badge">PhoBERT v2.1</span>
          </div>

          {/* ⚡ NÚT PHÂN TÍCH TẤT CẢ BÌNH LUẬN & REPLIES ⚡ */}
          <div className="ct-title-actions">
            <button
              type="button"
              className="ct-analyze-all-btn"
              onClick={handleAnalyzeAll}
              disabled={isAnalyzing || replies.length === 0}
              title="Phân tích toàn bộ bình luận và các câu trả lời bằng mô hình PhoBERT"
            >
              {isAnalyzing ? (
                <>
                  <span className="ct-spinner" />
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <span>Phân tích tất cả ({replies.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="ct-subtitle">
          {totalTopLevel} bình luận gốc • {totalChildReplies} phản hồi (replies) • {isMockMode ? 'Chế độ Demo (Mẫu)' : 'Dữ liệu trực tiếp từ tài khoản Threads'}
        </p>

        {/* Thông báo tiến độ / trạng thái phân tích */}
        {statusMsg && (
          <div className="ct-status-toast">
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* ── Post Selector Bar: Chọn bài viết của tài khoản đang đăng nhập ── */}
      <div className="ct-post-selector-bar">
        <div className="ct-post-selector-left">
          <span className="ct-post-label">BÀI VIẾT:</span>
          {isLoadingPosts ? (
            <span className="ct-post-label" style={{ color: '#22d3ee' }}>Đang nạp bài viết Threads...</span>
          ) : (
            <div className="ct-post-dropdown-wrap">
              <select
                className="ct-post-select"
                value={selectedPostId || ''}
                onChange={e => setSelectedPostId(e.target.value)}
              >
                {posts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.text ? (p.text.length > 50 ? p.text.substring(0, 50) + '...' : p.text) : `Post #${p.id}`} ({p.totalReplies || 0} replies)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          className="ct-refresh-btn"
          onClick={() => {
            if (isMockMode) {
              setReplies(mockReplies);
              setStatusMsg('Đã làm mới bình luận.');
              setTimeout(() => setStatusMsg(''), 2000);
            } else if (selectedPostId) {
              setSelectedPostId(prev => prev);
            }
          }}
          disabled={isLoadingComments}
          title="Đồng bộ lại bình luận từ Threads"
        >
          {isLoadingComments ? <span className="ct-spinner" /> : 'Đồng bộ'}
        </button>
      </div>

      {/* ── THÔNG TIN NGƯỠNG CẢNH BÁO TỪ SETTINGSPAGE (LÀM NỔI BẬT) ── */}
      <div className={`ct-threshold-bar ${stats.exceededCount > 0 ? 'ct-threshold-bar--has-alert' : ''}`}>
        <div className="ct-threshold-left">
          <div className="ct-threshold-badge-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="ct-threshold-text-wrap">
            <span className="ct-threshold-title">NGƯỠNG CẢNH BÁO CÀI ĐẶT:</span>
            <div className="ct-threshold-pill-group">
              <span className="ct-threshold-pill ct-threshold-pill--toxic" title="Ngưỡng độc hại cài đặt tại Settings">
                Toxicity ≥ <strong>{thresholds.toxicThreshold}%</strong>
              </span>
              <span className="ct-threshold-pill ct-threshold-pill--hate" title="Ngưỡng thù ghét/xúc phạm cài đặt tại Settings">
                Hate Speech ≥ <strong>{thresholds.hateThreshold}%</strong>
              </span>
              <span className="ct-threshold-pill ct-threshold-pill--sent" title="Ngưỡng cảm xúc tiêu cực cài đặt tại Settings">
                Tiêu cực ≥ <strong>{thresholds.sentimentThreshold}%</strong>
              </span>
            </div>
          </div>
          {stats.exceededCount > 0 ? (
            <button
              type="button"
              className="ct-threshold-alert-tag"
              onClick={() => setFilter('exceeded')}
              title="Bấm để lọc ngay các bình luận vượt ngưỡng cài đặt"
            >
              <span className="ct-alert-pulse" />
              {stats.exceededCount} vượt ngưỡng
            </button>
          ) : (
            <span className="ct-threshold-safe-tag">
              ✓ Chưa có bình luận vượt ngưỡng
            </span>
          )}
        </div>

        <button
          type="button"
          className="ct-threshold-settings-btn"
          onClick={() => navigate('/settings')}
          title="Mở trang Cài đặt để tùy chỉnh lại các thông số ngưỡng %"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Đổi cài đặt
        </button>
      </div>

      {/* Thẻ xem trước bài viết đang chọn */}
      {selectedPost && (
        <div className="ct-selected-post-card">
          <div className="ct-selected-post-header">
            <span className="ct-selected-post-tag">BÀI VIẾT GỐC</span>
            <span className="ct-post-author">{selectedPost.username}</span>
            <span className="ct-post-time">• {selectedPost.time}</span>
            {selectedPost.analyzed && (
              <span className="ct-post-analyzed-badge">Đã phân tích</span>
            )}
          </div>
          <p className="ct-selected-post-text">{selectedPost.text}</p>
        </div>
      )}

      {/* Search */}
      <div className="ct-search-row">
        <div className="ct-search-wrap">
          <svg className="ct-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            className="ct-search"
            placeholder="Tìm kiếm bình luận hoặc @tên người dùng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="ct-search-tag">{replies.length}</span>
      </div>

      {/* Filter bar */}
      <div className="ct-filter-bar">
        <span className="ct-filter-label">BỘ LỌC PHÂN TÍCH</span>
        <div className="ct-sort-wrap" onClick={() => setShowSort(s => !s)}>
          <span className="ct-sort-btn">Sắp xếp: {SORT_LABELS[sort] || sort}</span>
          {showSortMenu && (
            <div className="ct-sort-menu">
              {SORT_OPTIONS.map(o => (
                <div
                  key={o}
                  className={`ct-sort-item ${sort === o ? 'active' : ''}`}
                  onClick={() => { setSort(o); setShowSort(false); }}
                >
                  {SORT_LABELS[o] || o}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="ct-chips">
        {dynamicFilters.map(f => (
          <button
            key={f.id}
            className={`ct-chip ${activeFilter === f.id ? 'active' : ''} ct-chip--${f.id} ${f.isExceeded ? 'ct-chip--exceeded' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.isExceeded ? (
              <span className="ct-alert-dot" />
            ) : f.id !== 'all' && (
              <span className={`ct-chip-dot ct-chip-dot--${f.id}`} />
            )}
            {f.label} {f.count}
          </button>
        ))}
      </div>

      {/* Reply list or Empty state */}
      {replies.length === 0 ? (
        <div className="ct-empty-comments">
          <div className="ct-empty-badge">Trống</div>
          <h4 className="ct-empty-title">Chưa có bình luận nào</h4>
          <p className="ct-empty-desc">
            Bài viết này trên Threads chưa nhận được phản hồi nào từ cộng đồng. Hãy đăng thử một bình luận trên Threads để phân tích!
          </p>
          <button
            type="button"
            className="ct-analyze-btn"
            style={{ marginTop: 8 }}
            onClick={() => {
              setReplies(mockReplies);
              setIsMockMode(true);
            }}
          >
            Nạp bình luận mẫu để thử nghiệm
          </button>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="ct-empty-comments" style={{ padding: '24px 16px' }}>
          <div className="ct-empty-badge">Không có kết quả</div>
          <h4 className="ct-empty-title">Không tìm thấy kết quả phù hợp</h4>
          <p className="ct-empty-desc">
            Không có bình luận hay câu trả lời nào khớp với từ khóa hoặc bộ lọc đã chọn.
          </p>
          <button
            type="button"
            className="ct-refresh-btn"
            style={{ marginTop: 6 }}
            onClick={() => {
              setFilter('all');
              setSearch('');
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="ct-list">
          {displayItems.map(item => (
            <ReplyCard
              key={item.id}
              reply={item}
              childReplies={item.children || []}
              onAnalyzeSingle={handleAnalyzeSingle}
              isAnalyzing={isAnalyzing || analyzingId === item.id}
              analyzingId={analyzingId}
              thresholds={thresholds}
            />
          ))}
        </div>
      )}

      {/* New banner with Analyze button */}
      {showNewBanner && replies.length > 0 && stats.unprocCount > 0 && (
        <div className="ct-new-banner">
          <span className="ct-new-dot" />
          <span className="ct-new-text">Có <strong>{stats.unprocCount} bình luận &amp; phản hồi mới</strong> chưa được phân tích</span>
          <button
            className="ct-analyze-btn"
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "Đang xử lý..." : "Phân tích ngay"}
          </button>
          <button className="ct-close-btn" onClick={() => setShowNew(false)}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="ct-stats-row">
        {stats.unprocCount > 0 && (
          <span className="ct-stat" style={{ color: '#facc15' }}>Chưa phân tích: {stats.unprocCount}</span>
        )}
        {stats.exceededCount > 0 && (
          <span className="ct-stat" style={{ color: '#ef4444', fontWeight: 800 }}>
            Vượt ngưỡng: {stats.exceededCount}
          </span>
        )}
        <span className="ct-stat" style={{ color: '#38bdf8' }}>Bình luận: {totalTopLevel}</span>
        <span className="ct-stat" style={{ color: '#a78bfa' }}>Phản hồi: {totalChildReplies}</span>
        <span className="ct-stat ct-stat--pos">Tích cực: {stats.posCount}</span>
        <span className="ct-stat ct-stat--neu">Trung tính: {stats.neuCount}</span>
        <span className="ct-stat ct-stat--neg">Độc hại: {stats.toxCount}</span>
        <span className="ct-stat" style={{ color: '#10b981' }}>Clean: {stats.cleanCount}</span>
        <span className="ct-stat" style={{ color: '#f59e0b' }}>Offensive: {stats.offensiveCount}</span>
        <span className="ct-stat" style={{ color: '#ef4444' }}>Hate: {stats.hateCount}</span>
      </div>

    </div>
  );
}
