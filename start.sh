#!/usr/bin/env bash

# Thoát và tắt toàn bộ service con khi nhấn Ctrl+C
trap 'echo -e "\n🛑 Đang dừng toàn bộ các service..."; kill $(jobs -p) 2>/dev/null; exit 0' EXIT SIGINT SIGTERM

echo "=========================================================="
echo "   Khởi động Hệ Thống Web3 & AI K-12 (KLCN130)"
echo "=========================================================="

# 1. Khởi động ML Service (FastAPI / PhoBERT / SBERT)
echo "🚀 [1/3] Đang bật ML Service (Port 8001)..."
(cd ml-service && ./venv/bin/uvicorn app:app --host 127.0.0.1 --port 8001) &

# Chờ 2 giây để ML Service nạp model vào RAM
sleep 2

# 2. Khởi động Backend (Express API)
echo "🚀 [2/3] Đang bật Backend API (Port 5001)..."
(cd backend && npm run dev) &

# Chờ 1 giây
sleep 1

# 3. Khởi động Frontend (React)
echo "🚀 [3/3] Đang bật Frontend React (Port 3000)..."
(cd frontend && npm start) &

echo "=========================================================="
echo "✅ Tất cả service đã được kích hoạt!"
echo "👉 Frontend: http://localhost:3000"
echo "👉 Backend:  http://localhost:5001"
echo "👉 ML API:   http://127.0.0.1:8001"
echo "Nhấn [Ctrl + C] để dừng toàn bộ service cùng lúc."
echo "=========================================================="

wait
