from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import LABELS
from .model_manager import ModelManager
from .schemas import (
    PredictRequest,
    SinglePredictResponse,
    BatchPredictRequest,
    BatchPredictResponse,
)

manager = ModelManager()


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
)
def predict_batch(request: BatchPredictRequest):
    try:
        raw_comments = [
            {"id": c.id, "text": c.text}
            for c in request.comments
        ]
        results = manager.predict_batch(raw_comments)
        return {
            "total": len(results),
            "predictions": results,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi phân tích batch: {str(e)}",
        )