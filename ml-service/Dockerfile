FROM python:3.10-slim

WORKDIR /app

# Cài đặt các gói hệ thống cần thiết cho PyMuPDF, OCR và xử lý văn bản
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    tesseract-ocr-vie \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Hugging Face Spaces sử dụng port 7860 mặc định, Render sử dụng port 10000 hoặc biến $PORT
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}"]
