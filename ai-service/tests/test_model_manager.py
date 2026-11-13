import os
import sys
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.model_manager import ModelManager
from app.config import LABELS, MODEL_PATHS


class TestModelManager(unittest.TestCase):
    """
    Kiểm thử đơn vị cho lớp ModelManager quản lý 3 tác vụ PhoBERT:
    - Toxicity
    - Hate Speech
    - Sentiment
    """

    def setUp(self):
        self.manager = ModelManager()

    def test_model_manager_init(self):
        """Kiểm tra khởi tạo ModelManager và thiết bị mặc định (CPU/GPU)"""
        self.assertIsNotNone(self.manager.device)
        self.assertEqual(len(self.manager.models), 0)
        self.assertEqual(len(self.tokenizers), 0) if hasattr(self, 'tokenizers') else None

    def test_labels_configuration(self):
        """Kiểm tra cấu hình nhãn 3 tác vụ theo đúng chuẩn của hệ thống"""
        self.assertIn("toxicity", LABELS)
        self.assertEqual(LABELS["toxicity"][0], "NON-TOXIC")
        self.assertEqual(LABELS["toxicity"][1], "TOXIC")

        self.assertIn("hate_speech", LABELS)
        self.assertEqual(LABELS["hate_speech"][0], "CLEAN")
        self.assertEqual(LABELS["hate_speech"][1], "OFFENSIVE")
        self.assertEqual(LABELS["hate_speech"][2], "HATE")

        self.assertIn("sentiment", LABELS)
        self.assertEqual(LABELS["sentiment"][0], "NEGATIVE")
        self.assertEqual(LABELS["sentiment"][1], "NEUTRAL")
        self.assertEqual(LABELS["sentiment"][2], "POSITIVE")

    def test_predict_task_raises_error_when_model_not_loaded(self):
        """Báo lỗi ValueError khi gọi predict_task mà model chưa được nạp"""
        with self.assertRaises(ValueError):
            self.manager.predict_task("toxicity", ["văn bản kiểm thử"])

    def test_predict_single_with_mocked_tasks(self):
        """Kiểm tra tổng hợp kết quả predict_single cho đủ 3 tác vụ"""
        def mock_predict_task(task, texts):
            if task == "toxicity":
                return [{
                    "label_id": 0,
                    "label": "NON-TOXIC",
                    "confidence": 0.98,
                    "probabilities": {"NON-TOXIC": 0.98, "TOXIC": 0.02}
                }]
            elif task == "hate_speech":
                return [{
                    "label_id": 0,
                    "label": "CLEAN",
                    "confidence": 0.99,
                    "probabilities": {"CLEAN": 0.99, "OFFENSIVE": 0.01, "HATE": 0.0}
                }]
            elif task == "sentiment":
                return [{
                    "label_id": 2,
                    "label": "POSITIVE",
                    "confidence": 0.95,
                    "probabilities": {"NEGATIVE": 0.02, "NEUTRAL": 0.03, "POSITIVE": 0.95}
                }]
            return []

        with patch.object(self.manager, 'predict_task', side_effect=mock_predict_task):
            res = self.manager.predict_single("Sản phẩm rất tốt và đẹp")

            self.assertEqual(res["text"], "Sản phẩm rất tốt và đẹp")
            self.assertIn("processed_text", res)
            self.assertEqual(res["toxicity"]["label"], "NON-TOXIC")
            self.assertEqual(res["hate_speech"]["label"], "CLEAN")
            self.assertEqual(res["sentiment"]["label"], "POSITIVE")
            self.assertAlmostEqual(res["sentiment"]["confidence"], 0.95)

    def test_predict_batch_empty_list(self):
        """Kiểm tra predict_batch với danh sách bình luận rỗng -> trả về []"""
        res = self.manager.predict_batch([])
        self.assertEqual(res, [])

    def test_predict_batch_with_mocked_tasks(self):
        """Kiểm tra phân tích batch nhiều bình luận và ghép đúng ID"""
        comments = [
            {"id": "c1", "text": "Hàng đẹp lắm"},
            {"id": "c2", "text": "Lừa đảo quá tệ"}
        ]

        def mock_predict_task(task, texts):
            results = []
            for t in texts:
                if "tệ" in t or "lừa đảo" in t:
                    results.append({
                        "label_id": 1,
                        "label": "TOXIC" if task == "toxicity" else ("NEGATIVE" if task == "sentiment" else "CLEAN"),
                        "confidence": 0.95,
                        "probabilities": {}
                    })
                else:
                    results.append({
                        "label_id": 0,
                        "label": "NON-TOXIC" if task == "toxicity" else ("POSITIVE" if task == "sentiment" else "CLEAN"),
                        "confidence": 0.99,
                        "probabilities": {}
                    })
            return results

        with patch.object(self.manager, 'predict_task', side_effect=mock_predict_task):
            batch_res = self.manager.predict_batch(comments)

            self.assertEqual(len(batch_res), 2)
            self.assertEqual(batch_res[0]["id"], "c1")
            self.assertEqual(batch_res[0]["sentiment"]["label"], "POSITIVE")
            self.assertEqual(batch_res[1]["id"], "c2")
            self.assertEqual(batch_res[1]["toxicity"]["label"], "TOXIC")


if __name__ == "__main__":
    unittest.main()

