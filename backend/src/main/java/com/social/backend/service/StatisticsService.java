package com.social.backend.service;

import com.social.backend.dto.StatisticsResponse;
import com.social.backend.dto.StatisticsResponse.Keyword;
import com.social.backend.dto.StatisticsResponse.LabelCount;
import com.social.backend.dto.StatisticsResponse.Status;
import com.social.backend.dto.StatisticsResponse.Trend;
import com.social.backend.dto.StatisticsResponse.TrendPoint;
import com.social.backend.entity.Comment;
import com.social.backend.entity.Post;
import com.social.backend.entity.Prediction;
import com.social.backend.repository.CommentRepository;
import com.social.backend.repository.PostRepository;
import com.social.backend.repository.PredictionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Tính số liệu cho trang Thống kê. Đồng bộ reply mới từ Threads trước khi tính, không gọi AI Service.
 * Số liệu lấy từ bảng predictions vì mỗi lần quét lại, bảng này được cập nhật tại chỗ,
 * còn analysis_results sẽ thêm một dòng mới.
 */
@Service
public class StatisticsService {

    static final int TREND_POINTS = 12;
    static final int TOP_KEYWORDS = 8;
    private static final int MIN_KEYWORD_COMMENTS = 2;

    /** Threads API trả dạng 2023-07-17T20:51:00+0000; chấp nhận thêm +00:00 và Z. */
    private static final DateTimeFormatter TIMESTAMP_FORMAT = new DateTimeFormatterBuilder()
            .append(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            .appendPattern("[XXX][XX]")
            .toFormatter(Locale.ROOT);

    private static final Pattern URL_OR_MENTION = Pattern.compile("https?://\\S+|www\\.\\S+|@[\\p{L}\\p{N}._]+");
    /** Dấu câu ngắt cụm từ, để không ghép 2 từ ở hai câu khác nhau thành một cụm. */
    private static final Pattern SEGMENT_SEPARATOR = Pattern.compile("[^\\p{L}\\p{M}\\p{N}\\s]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern ONLY_DIGITS = Pattern.compile("\\p{N}+");

    private static final Set<String> STOPWORDS = Stream.of(
            "ai", "anh", "ấy", "bà", "bác", "bạn", "bao", "bằng", "bên", "bị", "bởi",
            "các", "cái", "cần", "càng", "cậu", "chỉ", "chị", "cho", "chú", "chưa", "chứ", "có", "cô",
            "còn", "của", "cũng", "cùng", "dạ", "để", "đã", "đang", "đây", "đấy", "đến", "đều", "đi", "điều",
            "đó", "được", "em", "gì", "hay", "hơn", "họ", "khi", "không", "là", "lại", "lên", "lúc", "mà",
            "mấy", "mình", "mỗi", "một", "này", "nào", "nên", "nếu", "ngày", "người", "nhà", "như", "nhưng",
            "những", "nhiều", "nó", "nữa", "ở", "ông", "qua", "quá", "ra", "rằng", "rất", "rồi", "sau", "sẽ",
            "so", "tại", "thì", "thế", "theo", "thôi", "tôi", "trên", "trong", "từ", "tui", "tuy", "và", "vào",
            "vậy", "về", "vì", "với", "vẫn", "việc", "xong", "ơi",
            "ko", "khong", "kh", "hok", "dc", "đc", "vs", "mk", "bt", "ng",
            "ok", "oke", "okay", "haha", "hihi", "hehe", "kkk"
    ).map(s -> Normalizer.normalize(s, Normalizer.Form.NFC)).collect(Collectors.toUnmodifiableSet());

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PredictionRepository predictionRepository;
    private final ThreadsPostService threadsPostService;

    public StatisticsService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PredictionRepository predictionRepository,
            ThreadsPostService threadsPostService
    ) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.predictionRepository = predictionRepository;
        this.threadsPostService = threadsPostService;
    }

    public StatisticsResponse getStatistics(String postId, String threadsUserId, String accessToken) {
        Post post = requireOwnedPost(postId, threadsUserId);
        boolean repliesSynced = threadsPostService.syncPostReplies(postId, accessToken);
        return buildStatistics(
                post,
                commentRepository.findByThreadsPostIdOrderByCreatedAtDesc(postId),
                predictionRepository.findByThreadsPostId(postId),
                Instant.now(),
                repliesSynced
        );
    }

    /** Trả 404 cả khi bài viết không thuộc người dùng này, để không lộ việc bài viết có tồn tại hay không. */
    public Post requireOwnedPost(String postId, String threadsUserId) {
        return postRepository.findByThreadsPostId(postId)
                .filter(post -> Objects.equals(post.getThreadsUserId(), threadsUserId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết: " + postId));
    }

    static StatisticsResponse buildStatistics(
            Post post,
            List<Comment> comments,
            List<Prediction> predictions,
            Instant now,
            boolean repliesSynced
    ) {
        long total = comments.size();
        long analyzed = predictions.size();

        long toxic = countLabel(predictions, Prediction::getToxicityLabel, "TOXIC");
        long hate = countLabel(predictions, Prediction::getHateSpeechLabel, "HATE");
        long positive = countLabel(predictions, Prediction::getSentimentLabel, "POSITIVE");
        long negative = countLabel(predictions, Prediction::getSentimentLabel, "NEGATIVE");
        // Giống analyzePost: nhãn cảm xúc khác POSITIVE/NEGATIVE được tính là trung tính
        long neutral = analyzed - positive - negative;

        Map<String, Prediction> predictionByComment = new HashMap<>();
        for (Prediction p : predictions) {
            predictionByComment.put(p.getThreadsCommentId(), p);
        }

        return new StatisticsResponse(
                post.getThreadsPostId(),
                resolveStatus(total, analyzed),
                repliesSynced,
                total,
                analyzed,
                percent(Math.min(analyzed, total), total),
                countRepliesSince(comments, now.minus(Duration.ofHours(1)), now),
                new LabelCount(toxic, percent(toxic, analyzed)),
                new LabelCount(hate, percent(hate, analyzed)),
                new LabelCount(positive, percent(positive, analyzed)),
                new LabelCount(neutral, percent(neutral, analyzed)),
                new LabelCount(negative, percent(negative, analyzed)),
                buildTrend(post.getThreadsTimestamp(), comments, predictionByComment),
                extractKeywords(comments, predictionByComment)
        );
    }

    private static Status resolveStatus(long total, long analyzed) {
        if (total == 0) return Status.NO_REPLIES;
        if (analyzed == 0) return Status.NOT_ANALYZED;
        return analyzed < total ? Status.HAS_NEW_REPLIES : Status.FINALIZED;
    }

    private static long countLabel(
            List<Prediction> predictions,
            Function<Prediction, String> label,
            String expected
    ) {
        return predictions.stream().filter(p -> expected.equalsIgnoreCase(label.apply(p))).count();
    }

    private static double percent(long part, long total) {
        return total == 0 ? 0 : Math.round(part * 1000.0 / total) / 10.0;
    }

    static Optional<Instant> parseTimestamp(String value) {
        if (value == null || value.isBlank()) return Optional.empty();
        try {
            return Optional.of(OffsetDateTime.parse(value.trim(), TIMESTAMP_FORMAT).toInstant());
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    private static long countRepliesSince(List<Comment> comments, Instant from, Instant to) {
        return comments.stream()
                .map(c -> parseTimestamp(c.getThreadsTimestamp()))
                .flatMap(Optional::stream)
                .filter(t -> !t.isBefore(from) && !t.isAfter(to))
                .count();
    }

    /**
     * Chia khoảng từ lúc đăng bài đến reply cuối thành TREND_POINTS mốc và cộng dồn số reply
     * toxic, tiêu cực tại từng mốc. Reply có thời gian sớm hơn lúc đăng được tính từ mốc đầu.
     */
    static Trend buildTrend(String postTimestamp, List<Comment> comments, Map<String, Prediction> predictionByComment) {
        record TimedPrediction(long epochMillis, Prediction prediction) {}

        List<TimedPrediction> timed = new ArrayList<>();
        long skipped = 0;
        for (Comment c : comments) {
            Prediction p = predictionByComment.get(c.getThreadsCommentId());
            if (p == null) continue;
            Optional<Instant> time = parseTimestamp(c.getThreadsTimestamp());
            if (time.isPresent()) {
                timed.add(new TimedPrediction(time.get().toEpochMilli(), p));
            } else {
                skipped++;
            }
        }

        Optional<Instant> postTime = parseTimestamp(postTimestamp);
        if (timed.isEmpty()) {
            return new Trend(postTime.isPresent(), skipped, List.of());
        }

        long first = timed.stream().mapToLong(TimedPrediction::epochMillis).min().orElseThrow();
        long last = timed.stream().mapToLong(TimedPrediction::epochMillis).max().orElseThrow();
        long start = postTime.map(Instant::toEpochMilli).orElse(first);
        long span = Math.max(0, last - start);

        List<TrendPoint> points = new ArrayList<>(TREND_POINTS);
        for (int i = 0; i < TREND_POINTS; i++) {
            long offset = span * i / (TREND_POINTS - 1);
            long cutoff = start + offset;
            long toxic = 0, negative = 0;
            for (TimedPrediction t : timed) {
                if (t.epochMillis() > cutoff) continue;
                if ("TOXIC".equalsIgnoreCase(t.prediction().getToxicityLabel())) toxic++;
                if ("NEGATIVE".equalsIgnoreCase(t.prediction().getSentimentLabel())) negative++;
            }
            points.add(new TrendPoint(Math.round(offset / 60000.0), toxic, negative));
        }
        return new Trend(postTime.isPresent(), skipped, points);
    }

    /**
     * Đếm từ đơn và cụm 2 từ theo số bình luận chứa chúng, nên một bình luận lặp từ nhiều lần
     * chỉ tính một lần. Đây là cách đếm gần đúng vì chưa có bước tách từ tiếng Việt.
     */
    static List<Keyword> extractKeywords(List<Comment> comments, Map<String, Prediction> predictionByComment) {
        Map<String, long[]> tallies = new HashMap<>();
        for (Comment c : comments) {
            Prediction p = predictionByComment.get(c.getThreadsCommentId());
            if (p == null || c.getText() == null) continue;
            int sentimentIndex = sentimentIndex(p.getSentimentLabel());
            for (String term : termsOf(c.getText())) {
                tallies.computeIfAbsent(term, k -> new long[3])[sentimentIndex]++;
            }
        }

        Map<String, Long> counts = new HashMap<>();
        tallies.forEach((term, sentiments) -> {
            long count = Arrays.stream(sentiments).sum();
            if (count >= MIN_KEYWORD_COMMENTS) counts.put(term, count);
        });

        return counts.entrySet().stream()
                .filter(e -> !isCoveredByPhrase(e.getKey(), e.getValue(), counts))
                .sorted(Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue).reversed()
                        .thenComparing(e -> e.getKey().contains(" ") ? 0 : 1)
                        .thenComparing(Map.Entry::getKey))
                .limit(TOP_KEYWORDS)
                .map(e -> new Keyword(e.getKey(), e.getValue(), dominantSentiment(tallies.get(e.getKey()))))
                .toList();
    }

    private static Set<String> termsOf(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        normalized = URL_OR_MENTION.matcher(normalized).replaceAll(".");

        Set<String> terms = new HashSet<>();
        for (String segment : SEGMENT_SEPARATOR.split(normalized)) {
            String previous = null;
            for (String token : WHITESPACE.split(segment.strip())) {
                if (!isUsefulToken(token)) {
                    previous = null;
                    continue;
                }
                terms.add(token);
                if (previous != null) terms.add(previous + " " + token);
                previous = token;
            }
        }
        return terms;
    }

    private static boolean isUsefulToken(String token) {
        return token.codePointCount(0, token.length()) >= 2
                && !STOPWORDS.contains(token)
                && !ONLY_DIGITS.matcher(token).matches();
    }

    /** Bỏ từ đơn nếu nó thường đi cùng một cụm đã có, ví dụ "công" khi đã có "công nghệ". */
    private static boolean isCoveredByPhrase(String term, long count, Map<String, Long> counts) {
        if (term.contains(" ")) return false;
        return counts.entrySet().stream().anyMatch(e -> {
            String phrase = e.getKey();
            boolean containsTerm = phrase.startsWith(term + " ") || phrase.endsWith(" " + term);
            return containsTerm && e.getValue() * 2 >= count;
        });
    }

    private static int sentimentIndex(String label) {
        if ("POSITIVE".equalsIgnoreCase(label)) return 0;
        if ("NEGATIVE".equalsIgnoreCase(label)) return 2;
        return 1;
    }

    private static String dominantSentiment(long[] sentiments) {
        long positive = sentiments[0], neutral = sentiments[1], negative = sentiments[2];
        if (positive > neutral && positive > negative) return "POSITIVE";
        if (negative > neutral && negative > positive) return "NEGATIVE";
        return "NEUTRAL";
    }
}
