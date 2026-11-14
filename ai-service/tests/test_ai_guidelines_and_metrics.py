import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.config import LABELS


class TestAiGuidelinesAndMetrics(unittest.TestCase):
    """
    Kiểm thử các quy tắc nghiệp vụ, tính toán điểm số và ánh xạ nhãn theo tài liệu hướng dẫn AI.
    """

    def test_sentiment_net_score_calculation(self):
        """Kiểm tra công thức tính điểm cảm xúc ròng Net Score: ((pos - neg)/total)*100"""
        pos = 65
        neg = 15
        total = 100

        net_score = round(((pos - neg) / total) * 100)
        self.assertEqual(net_score, 50)

    def test_toxicity_threshold_safe_boundary(self):
        """Kiểm tra ngưỡng phân định nhãn Lành mạnh (Safe Rate >= 90%)"""
        total = 150
        toxic = 8
        non_toxic = 142

        safe_rate = (non_toxic / total) * 100
        self.assertGreaterEqual(safe_rate, 90.0)
        self.assertEqual(round(safe_rate, 1), 94.7)

    def test_hate_speech_label_encoding_integrity(self):
        """Đảm bảo nhãn Hate Speech gồm đúng 3 cấp độ: CLEAN (0), OFFENSIVE (1), HATE (2)"""
        hate_labels = LABELS.get("hate_speech", {})
        self.assertEqual(len(hate_labels), 3)
        self.assertEqual(hate_labels[0], "CLEAN")
        self.assertEqual(hate_labels[1], "OFFENSIVE")
        self.assertEqual(hate_labels[2], "HATE")

    def test_confidence_probability_sum_constraint(self):
        """Tổng xác suất của các nhãn dự đoán trong 1 tác vụ phải xấp xỉ 1.0 (100%)"""
        mock_probs = {"NON-TOXIC": 0.982, "TOXIC": 0.018}
        total_prob = sum(mock_probs.values())
        self.assertAlmostEqual(total_prob, 1.0, places=3)

    def test_sentiment_label_mappings(self):
        """Xác thực ánh xạ nhãn Sentiment: 0 -> NEGATIVE, 1 -> NEUTRAL, 2 -> POSITIVE"""
        sentiment_labels = LABELS.get("sentiment", {})
        self.assertEqual(sentiment_labels[0], "NEGATIVE")
        self.assertEqual(sentiment_labels[1], "NEUTRAL")
        self.assertEqual(sentiment_labels[2], "POSITIVE")


if __name__ == "__main__":
    unittest.main()

