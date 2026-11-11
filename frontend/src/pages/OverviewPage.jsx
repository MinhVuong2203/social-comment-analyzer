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

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

    try {
      setAnalyzing(true);
      setErrorMsg(null);
      const result = await apiService.analyzePost(selectedPostId);
      setPostAnalysis(result);
      await Promise.all([loadPosts(), loadOverview()]);
    } catch (err) {
      setErrorMsg(err.message || "Lỗi khi phân tích bài viết. Hãy chắc chắn AI Service và Backend đang chạy.");
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

  return (
    <div className="tab-tong-quan">
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
          ⚠️ {errorMsg}
        </div>
      )}

      <ThreadInfoCard 
        posts={posts}
        selectedPostId={selectedPostId}
        onSelectPost={(id) => setSelectedPostId(id)}
        onScan={handleScanPost}
        scanning={analyzing}
        username={user?.username}
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
