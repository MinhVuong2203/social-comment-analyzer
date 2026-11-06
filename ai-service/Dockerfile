FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Cài torch bản CPU trước: bản mặc định trên Linux kèm CUDA, làm image nặng thêm nhiều GB.
COPY requirements.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

# Tải model vào image. Repo phải có 3 thư mục: toxicity, hate_speech, sentiment.
# MODEL_REPO là biến môi trường trên Render, ví dụ: ten-ban/social-comment-models.
# Repo private cần thêm secret file tên hf_token chứa token của Hugging Face.
ARG MODEL_REPO
RUN --mount=type=secret,id=hf_token sh -c '\
    set -e; \
    if [ -z "$MODEL_REPO" ]; then echo "Thieu bien MODEL_REPO" >&2; exit 1; fi; \
    if [ -f /run/secrets/hf_token ]; then export HF_TOKEN="$(cat /run/secrets/hf_token)"; fi; \
    hf download "$MODEL_REPO" --local-dir models; \
    rm -rf models/.cache; \
    for task in toxicity hate_speech sentiment; do \
        test -f "models/$task/config.json" || { echo "Thieu model: $task" >&2; exit 1; }; \
    done'

COPY app ./app

# Render cấp cổng qua biến PORT; khi chạy nơi khác thì mặc định là 8000.
# Không có API key thì dừng ngay, tránh để lộ API dự đoán ra Internet.
CMD ["sh", "-c", ": \"${AI_SERVICE_API_KEY:?Thieu bien AI_SERVICE_API_KEY}\"; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
