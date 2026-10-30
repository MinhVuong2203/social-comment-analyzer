from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class PredictRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=20000,
        description="Nội dung bình luận cần phân tích",
        examples=["sẽ mãi ủng hộ anh ❤"],
    )


class BatchComment(BaseModel):
    id: str = Field(..., description="Mã định danh duy nhất của bình luận")
    text: str = Field(
        ...,
        min_length=1,
        max_length=20000,
        description="Nội dung văn bản bình luận",
    )


class BatchPredictRequest(BaseModel):
    comments: List[BatchComment] = Field(
        ...,
        description="Danh sách các bình luận cần xử lý batch",
    )


class TaskPrediction(BaseModel):
    label_id: int
    label: str
    confidence: float
    probabilities: Dict[str, float]


class SinglePredictResponse(BaseModel):
    text: str
    processed_text: str
    toxicity: TaskPrediction
    hate_speech: TaskPrediction
    sentiment: TaskPrediction


class BatchCommentResult(BaseModel):
    id: str
    text: str
    processed_text: str
    toxicity: TaskPrediction
    hate_speech: TaskPrediction
    sentiment: TaskPrediction


class BatchPredictResponse(BaseModel):
    total: int
    predictions: List[BatchCommentResult]
