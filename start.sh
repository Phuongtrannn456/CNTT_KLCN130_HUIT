#!/usr/bin/env bash

# Thoat va tat toan bo service con khi nhan Ctrl+C
trap 'echo -e "\nDang dung toan bo cac service..."; kill $(jobs -p) 2>/dev/null; exit 0' EXIT SIGINT SIGTERM

echo "=========================================================="
echo "   Khoi dong He Thong Web3 & AI K-12 (KLCN130)"
echo "=========================================================="

# 1. Khoi dong Hardhat Node & deploy hop dong (Port 8545) neu chua chay
if ! lsof -i :8545 >/dev/null 2>&1; then
  echo "[1/4] Dang bat Hardhat Blockchain Node (Port 8545)..."
  (cd backend && npx hardhat node > /dev/null 2>&1) &
  sleep 3
  (cd backend && npx hardhat run scripts/deploy-and-seed-sepolia.js --network localhost > /dev/null 2>&1)
else
  echo "[1/4] Hardhat Blockchain Node dang chay san tai Port 8545."
fi

# 2. Khoi dong ML Service (FastAPI / PhoBERT / SBERT)
echo "[2/4] Dang bat ML Service (Port 8001)..."
(cd ml-service && ./venv/bin/uvicorn app:app --host 127.0.0.1 --port 8001) &

# Cho 2 giay de ML Service nap model vao RAM
sleep 2

# 3. Khoi dong Backend (Express API)
echo "[3/4] Dang bat Backend API (Port 5001)..."
(cd backend && npm run dev) &

# Cho 1 giay
sleep 1

# 4. Khoi dong Frontend (React)
echo "[4/4] Dang bat Frontend React (Port 3000)..."
(cd frontend && npm start) &

echo "=========================================================="
echo "Tat ca service da duoc kich hoat thanh cong:"
echo "- Blockchain: http://127.0.0.1:8545"
echo "- ML Service: http://127.0.0.1:8001"
echo "- Backend:    http://localhost:5001"
echo "- Frontend:   http://localhost:3000"
echo "Nhan [Ctrl + C] de dung toan bo service."
echo "=========================================================="

wait
