package com.social.backend.dto;

import java.util.List;

/**
 * Dữ liệu của trang Thống kê cho một bài viết.
 * Mọi tỷ lệ phần trăm (trừ analyzedPercent) được tính trên số reply đã phân tích.
 * repliesSynced = false nghĩa là không lấy được reply mới từ Threads, số liệu chỉ từ dữ liệu đã lưu.
 */
public record StatisticsResponse(
        String postId,
        Status status,
        boolean repliesSynced,
        long totalReplies,
        long analyzedReplies,
        double analyzedPercent,
        long repliesLastHour,
        LabelCount toxic,
        LabelCount hate,
        LabelCount positive,
        LabelCount neutral,
        LabelCount negative,
        Trend trend,
        List<Keyword> keywords
) {

    public enum Status {
        NO_REPLIES,
        NOT_ANALYZED,
        HAS_NEW_REPLIES,
        FINALIZED
    }

    public record LabelCount(long count, double percent) {}

    /**
     * @param startsAtPost true nếu mốc đầu là lúc đăng bài, false nếu là reply đầu tiên
     *                     (bài viết không có thời gian đăng hợp lệ)
     * @param skippedReplies số reply đã phân tích nhưng không có thời gian hợp lệ nên không vẽ được
     */
    public record Trend(boolean startsAtPost, long skippedReplies, List<TrendPoint> points) {}

    /** Số lượng cộng dồn tính đến mốc thời gian này. */
    public record TrendPoint(long minutesFromStart, long toxic, long negative) {}

    /** @param sentiment cảm xúc chiếm ưu thế: POSITIVE, NEUTRAL hoặc NEGATIVE */
    public record Keyword(String term, long count, String sentiment) {}
}
