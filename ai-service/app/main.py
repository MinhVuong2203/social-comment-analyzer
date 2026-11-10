from contextlib import asynccontextmanager
import secrets
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import API_KEY, BATCH_SIZE, LABELS
from .model_manager import ModelManager
from .preprocessing import get_teencode_stats
from .schemas import (
    PredictRequest,
    SinglePredictResponse,
    BatchPredictRequest,
    BatchPredictResponse,
)

manager = ModelManager()


def require_api_key(x_api_key: Optional[str] = Header(default=None)):
    if API_KEY and not (
        x_api_key and secrets.compare_digest(x_api_key.encode(), API_KEY.encode())
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key không hợp lệ.",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động và nạp 3 mô hình PhoBERT vào bộ nhớ
    manager.load_models()
    yield
    # Giải phóng tài nguyên khi tắt server (nếu cần)
    manager.models.clear()
    manager.tokenizers.clear()


app = FastAPI(
    title="Social Comment Analyzer AI Service",
    description="Microservice phân loại bình luận tiếng Việt (Toxicity, Hate Speech, Sentiment) bằng PhoBERT.",
    version="1.0.0",
    lifespan=lifespan,
)

# Cho phép CORS để thuận tiện kiểm thử
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Kiểm tra trạng thái dịch vụ và mô hình")
def health():
    return {
        "status": "healthy",
        "device": str(manager.device),
        "models": {
            name: (name in manager.models)
            for name in LABELS
        },
        "teencode": get_teencode_stats(),
    }


@app.get("/models", summary="Danh sách các tác vụ và nhãn phân loại")
def models():
    return {
        "models": [
            {
                "task": task,
                "labels": list(labels.values()),
            }
            for task, labels in LABELS.items()
        ]
    }


@app.post(
    "/predict",
    response_model=SinglePredictResponse,
    summary="Phân tích một bình luận (Toxicity, Hate Speech, Sentiment)",
    dependencies=[Depends(require_api_key)],
)
def predict(request: PredictRequest):
    try:
        result = manager.predict_single(request.text)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi phân tích bình luận: {str(e)}",
        )


@app.post(
    "/predict/batch",
    response_model=BatchPredictResponse,
    summary="Phân tích danh sách bình luận theo batch",
    dependencies=[Depends(require_api_key)],
)
def predict_batch(request: BatchPredictRequest):
    try:
        raw_comments = [
            {"id": c.id, "text": c.text}
            for c in request.comments
        ]
        # Chia nhỏ để bài viết nhiều bình luận không làm tràn RAM
        results = []
        for start in range(0, len(raw_comments), BATCH_SIZE):
            results.extend(manager.predict_batch(raw_comments[start:start + BATCH_SIZE]))
        return {
            "total": len(results),
            "predictions": results,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi phân tích batch: {str(e)}",
        )