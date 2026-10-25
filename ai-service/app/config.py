from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
MAX_LENGTH = 256

MODEL_PATHS = {
    "toxicity": MODEL_DIR / "toxicity",
    "hate_speech": MODEL_DIR / "hate_speech",
    "sentiment": MODEL_DIR / "sentiment",
}

LABELS = {
    "toxicity": {
        0: "NON-TOXIC",
        1: "TOXIC",
    },
    "hate_speech": {
        0: "CLEAN",
        1: "OFFENSIVE",
        2: "HATE",
    },
    "sentiment": {
        0: "NEGATIVE",
        1: "NEUTRAL",
        2: "POSITIVE",
    },
}

# Host & Port configuration
HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
