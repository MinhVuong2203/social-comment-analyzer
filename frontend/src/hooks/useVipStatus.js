import { useState, useEffect, useCallback } from 'react';
import { getUserLimitStatus } from '../services/settingsService';

/**
 * Hook lấy và theo dõi trạng thái VIP + quota của người dùng hiện tại.
 * - isVipOrAdmin: true nếu là VIP hoặc Admin (không bị giới hạn)
 * - remainingAnalysis: số lần phân tích còn lại hôm nay (-1 = unlimited)
 * - remainingExports: số lần xuất báo cáo còn lại hôm nay (-1 = unlimited)
 * - dailyAnalyzeLimit: giới hạn tối đa / ngày
 * - dailyExportLimit: giới hạn tối đa / ngày
 */
export function useVipStatus() {
  const [status, setStatus] = useState({
    isVipOrAdmin: false,
    remainingAnalysis: 3,
    remainingExports: 3,
    dailyAnalyzeLimit: 3,
    dailyExportLimit: 3,
    usedAnalysis: 0,
    usedExports: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getUserLimitStatus();
      setStatus(data);
    } catch (err) {
      console.warn('Không thể lấy limit status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...status, loading, refresh };
}
