FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Cài torch bản CPU trước: bản mặc định trên Linux kèm CUDA, làm image nặng thêm nhiều GB.
COPY requirements.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

COPY app ./app

# Model không nằm trong image: mount thư mục ai-service/models vào /app/models khi chạy.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
