from fastapi import FastAPI
from pydantic import BaseModel

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)

import torch


MODEL_PATH = "./models/victsd-phobert"


app = FastAPI(
    title="PhoBERT ViCTSD AI Service",
    version="1.0.0"
)


# =========================
# Load model
# =========================

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_PATH
)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.eval()


# =========================
# Request
# =========================

class PredictRequest(BaseModel):
    text: str


# =========================
# Health check
# =========================

@app.get("/health")
def health():

    return {
        "status": "UP"
    }


# =========================
# Prediction
# =========================

@app.post("/predict")
def predict(request: PredictRequest):

    inputs = tokenizer(
        request.text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    with torch.no_grad():

        outputs = model(**inputs)

        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )

        prediction = torch.argmax(
            probabilities,
            dim=-1
        ).item()

    return {
        "text": request.text,
        "label": prediction,
        "probabilities": probabilities[0].tolist()
    }