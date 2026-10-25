import logging
from typing import Dict, List, Any
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from .config import MODEL_PATHS, LABELS, MAX_LENGTH
from .preprocessing import clean_text

logger = logging.getLogger("ai_service.model_manager")
logging.basicConfig(level=logging.INFO)


class ModelManager:
    """
    Quản lý việc nạp và suy luận 3 mô hình PhoBERT:
    - toxicity
    - hate_speech
    - sentiment
    Mô hình được nạp một lần duy nhất vào bộ nhớ khi khởi động server.
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.models: Dict[str, AutoModelForSequenceClassification] = {}
        self.tokenizers: Dict[str, AutoTokenizer] = {}

    def load_models(self):
        logger.info(f"Đang khởi động ModelManager trên thiết bị: {self.device}")

        for task, model_path in MODEL_PATHS.items():
            if not model_path.exists():
                logger.warning(f"Không tìm thấy thư mục mô hình cho task '{task}' tại {model_path}")
                continue

            logger.info(f"Đang tải mô hình & tokenizer cho '{task}' từ {model_path}...")
            try:
                tokenizer = AutoTokenizer.from_pretrained(str(model_path))
                model = AutoModelForSequenceClassification.from_pretrained(str(model_path))
                model.to(self.device)
                model.eval()

                self.tokenizers[task] = tokenizer
                self.models[task] = model
                logger.info(f"Tải thành công mô hình '{task}'.")
            except Exception as e:
                logger.error(f"Lỗi khi nạp mô hình '{task}': {e}", exc_info=True)
                raise e

        logger.info(f"Hoàn tất nạp {len(self.models)}/{len(MODEL_PATHS)} mô hình PhoBERT.")

    def predict_task(self, task: str, processed_texts: List[str]) -> List[Dict[str, Any]]:
        """
        Dự đoán cho một danh sách các chuỗi văn bản đã qua hàm clean_text() cho 1 tác vụ cụ thể.
        """
        if task not in self.models:
            raise ValueError(f"Mô hình cho tác vụ '{task}' chưa sẵn sàng hoặc không tồn tại.")

        tokenizer = self.tokenizers[task]
        model = self.models[task]

        inputs = tokenizer(
            processed_texts,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=MAX_LENGTH,
        )

        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            probabilities = torch.softmax(outputs.logits, dim=-1)

        results = []
        label_map = LABELS[task]

        for probs in probabilities:
            predicted_id = int(torch.argmax(probs).item())
            probs_cpu = probs.cpu().tolist()

            results.append({
                "label_id": predicted_id,
                "label": label_map.get(predicted_id, f"LABEL_{predicted_id}"),
                "confidence": float(probs_cpu[predicted_id]),
                "probabilities": {
                    label_map.get(i, f"LABEL_{i}"): float(prob)
                    for i, prob in enumerate(probs_cpu)
                },
            })

        return results

    def predict_single(self, text: str) -> Dict[str, Any]:
        """
        Phân tích 1 bình luận cho toàn bộ 3 tác vụ trong một lần gọi.
        """
        processed_text = clean_text(text)

        result = {
            "text": text,
            "processed_text": processed_text,
        }

        for task in MODEL_PATHS:
            task_pred = self.predict_task(task, [processed_text])[0]
            result[task] = task_pred

        return result

    def predict_batch(self, comments: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Phân tích batch nhiều bình luận:
        Mỗi comment có {"id": "...", "text": "..."}
        """
        if not comments:
            return []

        texts = [c["text"] for c in comments]
        processed_texts = [clean_text(t) for t in texts]

        # Khởi tạo kết quả cơ sở
        output = [
            {
                "id": c["id"],
                "text": c["text"],
                "processed_text": processed_texts[idx],
            }
            for idx, c in enumerate(comments)
        ]

        # Thực thi batch inference cho từng task để tận dụng vectorization của PyTorch
        for task in MODEL_PATHS:
            task_predictions = self.predict_task(task, processed_texts)
            for idx, pred in enumerate(task_predictions):
                output[idx][task] = pred

        return output
