import React, { useState, useEffect, useCallback } from 'react';
import '../assets/styles/TabTongQuan.css';

import ThreadInfoCard from '../components/overview/ThreadInfoCard';
import SummaryCard from '../components/overview/SummaryCard';
import SentimentCard from '../components/overview/SentimentCard';
import ToxicityCard from '../components/overview/ToxicityCard';
import QuickActions from '../components/overview/QuickActions';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { useVipStatus } from '../hooks/useVipStatus';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const vipStatus = useVipStatus();

  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [postAnalysis, setPostAnalysis] = useState(null);
  const [overviewStats, setOverviewStats] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadPosts = useCallback(async () => {
    try {
      setErrorMsg(null);
      const postList = await apiService.getPosts();
      setPosts(postList || []);
      if (postList && postList.length > 0) {
        setSelectedPostId((prev) => prev || postList[0].id);
      }
    } catch (err) {
      console.warn("Lỗi khi tải danh sách bài viết:", err);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const data = await apiService.getOverview();
      setOverviewStats(data);
    } catch (err) {
      console.warn("Lỗi khi tải overview:", err);
    }
  }, []);

  const loadPostAnalysis = useCallback(async (postId) => {
    if (!postId) return;
    try {
      const analysis = await apiService.getPostAnalysis(postId);
      setPostAnalysis(analysis);
    } catch {
      setPostAnalysis(null);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadOverview();
  }, [loadPosts, loadOverview]);

  useEffect(() => {
    if (selectedPostId) {
      loadPostAnalysis(selectedPostId);
    }
  }, [selectedPostId, loadPostAnalysis]);

  const handleScanPost = async () => {
    if (!selectedPostId) {
      setErrorMsg("Vui lòng chọn một bài viết trước khi quét.");
      return;
    }

    // Kiểm tra quota phía client trước (non-VIP)
    if (!vipStatus.isVipOrAdmin && vipStatus.remainingAnalysis === 0) {
      setErrorMsg(`Bạn đã dùng hết ${vipStatus.dailyAnalyzeLimit} lần phân tích trong ngày hôm nay. Nâng cấp VIP để phân tích không giới hạn.`);
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMsg(null);
      const result = await apiService.analyzePost(selectedPostId);
      setPostAnalysis(result);
      await Promise.all([loadPosts(), loadOverview(), vipStatus.refresh()]);
    } catch (err) {
      // Xử lý lỗi 429 quota exceeded từ server
      if (err.message && err.message.includes('429')) {
        setErrorMsg(`Bạn đã đạt giới hạn ${vipStatus.dailyAnalyzeLimit} lần phân tích trong ngày. Nâng cấp VIP để phân tích không giới hạn.`);
      } else {
        setErrorMsg(err.message || "Lỗi khi phân tích bài viết. Hãy chắc chắn AI Service và Backend đang chạy.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const currentTotalReplies = postAnalysis?.totalComments ?? overviewStats?.totalComments ?? 0;

  const rawSentiment = postAnalysis?.sentiment ?? overviewStats?.sentiment ?? {};
  const posCount = rawSentiment['POSITIVE'] || 0;
  const neuCount = rawSentiment['NEUTRAL'] || 0;
  const negCount = rawSentiment['NEGATIVE'] || 0;
  const totalSent = posCount + neuCount + negCount;

  const sentimentData = {
    positive: {
      count: posCount,
      percent: totalSent > 0 ? parseFloat(((posCount / totalSent) * 100).toFixed(1)) : 0
    },
    neutral: {
      count: neuCount,
      percent: totalSent > 0 ? parseFloat(((neuCount / totalSent) * 100).toFixed(1)) : 0
    },
    negative: {
      count: negCount,
      percent: totalSent > 0 ? parseFloat(((negCount / totalSent) * 100).toFixed(1)) : 0
    },
    netScore: totalSent > 0 ? Math.round(((posCount - negCount) / totalSent) * 100) : 0
  };

  const rawToxicity = postAnalysis?.toxicity ?? overviewStats?.toxicity ?? {};
  const rawHate = postAnalysis?.hateSpeech ?? overviewStats?.hateSpeech ?? {};

  const toxicCount = rawToxicity['TOXIC'] || 0;
  const nonToxicCount = rawToxicity['NON-TOXIC'] || 0;
  const totalTox = toxicCount + nonToxicCount;

  const hateCount = rawHate['HATE'] || 0;
  const cleanCount = rawHate['CLEAN'] || 0;
  const offensiveCount = rawHate['OFFENSIVE'] || 0;
  const totalHate = hateCount + cleanCount + offensiveCount;

  const toxicityData = {
    overall: totalTox > 0 ? parseFloat(((nonToxicCount / totalTox) * 100).toFixed(1)) : 100,
    label: (totalTox > 0 && toxicCount > nonToxicCount) ? 'Cảnh báo' : 'Lành mạnh',
    safe: totalTox > 0 ? parseFloat(((nonToxicCount / totalTox) * 100).toFixed(1)) : 100,
    low: 0,
    medium: 0,
    high: totalTox > 0 ? parseFloat(((toxicCount / totalTox) * 100).toFixed(1)) : 0,
    hateNon: totalHate > 0 ? parseFloat((((cleanCount + offensiveCount) / totalHate) * 100).toFixed(1)) : 100,
    hate: totalHate > 0 ? parseFloat(((hateCount / totalHate) * 100).toFixed(1)) : 0,
    hateCount: hateCount
  };

  const summaryStats = {
    analyzed: currentTotalReplies,
    phobert: 96.8,
    total: currentTotalReplies
  };

  // Hiển thị quota banner cho non-VIP
  const showQuotaBanner = !vipStatus.loading && !vipStatus.isVipOrAdmin;

  return (
    <div className="tab-tong-quan">
      {/* Quota Banner */}
      {showQuotaBanner && (
        <div style={{
          padding: '8px 12px',
          background: vipStatus.remainingAnalysis === 0
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${vipStatus.remainingAnalysis === 0
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(245, 158, 11, 0.25)'}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 10.5, color: vipStatus.remainingAnalysis === 0 ? '#f87171' : '#fbbf24' }}>
            {vipStatus.remainingAnalysis === 0
              ? `Hết lượt phân tích hôm nay (${vipStatus.dailyAnalyzeLimit}/${vipStatus.dailyAnalyzeLimit}).`
              : `Lượt phân tích còn lại hôm nay: ${vipStatus.remainingAnalysis}/${vipStatus.dailyAnalyzeLimit}`}
            {' '}
            <span style={{ color: '#94a3b8' }}>
              Nâng cấp VIP để phân tích không giới hạn.
            </span>
          </div>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '3px 10px',
              background: 'rgba(255,215,0,0.12)',
              border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd700',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Nâng cấp VIP
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          color: '#f87171',
          fontSize: 11,
          lineHeight: 1.4
        }}>
          {errorMsg}
        </div>
      )}

      <ThreadInfoCard 
        posts={posts}
        selectedPostId={selectedPostId}
        onSelectPost={(id) => setSelectedPostId(id)}
        onScan={handleScanPost}
        scanning={analyzing}
        username={user?.username}
        canScan={vipStatus.isVipOrAdmin || vipStatus.remainingAnalysis > 0}
      />

      <SummaryCard stats={summaryStats} />
      <SentimentCard sentiment={sentimentData} />
      <ToxicityCard toxicity={toxicityData} />
      <QuickActions onAction={(id) => {
        if (id === 'view-replies' || id === 'filter-toxic' || id === 'deep-analysis') {
          navigate('/comments');
        }
      }} />
    </div>
  );
}
