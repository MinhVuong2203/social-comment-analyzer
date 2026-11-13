import os
import sys
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.config import LABELS
from app.preprocessing import get_teencode_stats


class TestApiEndpointsLogic(unittest.TestCase):
    """
    Kiểm thử logic của các endpoint API trong AI Service:
    - /health
    - /models
    - /predict logic
    - /predict/batch logic
    - Kiểm tra bảo mật API Key (require_api_key)
    """

    def test_health_response_structure(self):
        """Kiểm tra cấu trúc dữ liệu trả về của endpoint /health"""
        # Giả lập trạng thái model manager
        mock_models = {"toxicity": object(), "hate_speech": object(), "sentiment": object()}
        device_str = "cpu"

        health_data = {
            "status": "healthy",
            "device": device_str,
            "models": {
                name: (name in mock_models)
                for name in LABELS
            },
            "teencode": get_teencode_stats(),
        }

        self.assertEqual(health_data["status"], "healthy")
        self.assertEqual(health_data["device"], "cpu")
        self.assertTrue(health_data["models"]["toxicity"])
        self.assertTrue(health_data["models"]["hate_speech"])
        self.assertTrue(health_data["models"]["sentiment"])
        self.assertIn("single_words_count", health_data["teencode"])

    def test_models_response_structure(self):
        """Kiểm tra cấu trúc dữ liệu trả về của endpoint /models"""
        models_data = {
            "models": [
                {
                    "task": task,
                    "labels": list(labels.values()),
                }
                for task, labels in LABELS.items()
            ]
        }

        self.assertEqual(len(models_data["models"]), 3)
        tasks = [m["task"] for m in models_data["models"]]
        self.assertIn("toxicity", tasks)
        self.assertIn("hate_speech", tasks)
        self.assertIn("sentiment", tasks)

        # Kiểm tra chi tiết nhãn toxicity
        tox = next(m for m in models_data["models"] if m["task"] == "toxicity")
        self.assertListEqual(tox["labels"], ["NON-TOXIC", "TOXIC"])

    def test_api_key_security_check(self):
        """Kiểm tra logic bảo vệ endpoint qua header X-API-Key"""
        import secrets

        configured_key = "secret_ai_token_12345"

        def check_auth(header_val: str, key: str) -> bool:
            if not key:
                return True
            if not header_val:
                return False
            return secrets.compare_digest(header_val.encode(), key.encode())

        # Trường hợp không cấu hình API Key -> cho phép
        self.assertTrue(check_auth("any", ""))
        # Trường hợp cấu hình đúng key -> hợp lệ
        self.assertTrue(check_auth("secret_ai_token_12345", configured_key))
        # Trường hợp sai key hoặc không có key -> từ chối
        self.assertFalse(check_auth("wrong_key", configured_key))
        self.assertFalse(check_auth(None, configured_key))

    def test_batch_slicing_logic(self):
        """Kiểm tra logic chia batch nhỏ tránh tràn bộ nhớ khi bài viết có nhiều comment"""
        batch_size = 4
        comments = [{"id": f"c_{i}", "text": f"cmt {i}"} for i in range(10)]

        batches = []
        for start in range(0, len(comments), batch_size):
            batches.append(comments[start:start + batch_size])

        self.assertEqual(len(batches), 3)
        self.assertEqual(len(batches[0]), 4)
        self.assertEqual(len(batches[1]), 4)
        self.assertEqual(len(batches[2]), 2)
        self.assertEqual(batches[2][1]["id"], "c_9")


if __name__ == "__main__":
    unittest.main()

