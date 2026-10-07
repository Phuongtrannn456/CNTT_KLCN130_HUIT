# Web3 K-12 Education Platform

Nền tảng Giáo dục K-12 tích hợp Blockchain và Trí tuệ Nhân tạo, được xây dựng trong khuôn khổ khóa luận KLCN130.

## 🎯 Purpose
Dự án hướng đến việc số hóa quy trình quản lý học tập (Learning Challenges), hỗ trợ giáo viên bằng AI (Phân tích, Gợi ý chấm điểm) và minh bạch hóa thành tích học sinh bằng chứng nhận Web3 (Educational Credentials) ghi trên Blockchain.

## 🏗 Architecture
- **Frontend**: React.js (Ant Design)
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **AI/ML Service**: FastAPI (SBERT, PhoBERT)
- **Blockchain**: Solidity, Ethers.js, Hardhat (Local/Testnet)
- Xem chi tiết tại `docs/ARCHITECTURE.md`.

## 🚀 Tech Stack
- Frontend: React 18, React Router v6, Axios.
- Backend: Express, JsonWebToken, Ethers.js v6.
- Blockchain: Solidity ^0.8.19, Hardhat.

## 🔧 Installation & Running
Tham khảo chi tiết tại `docs/DEPLOYMENT.md`.

1. **MongoDB**: Chạy service MongoDB localhost (port 27017).
2. **Blockchain**:
   ```bash
   cd backend
   npx hardhat node
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. **Backend**:
   ```bash
   cd backend
   cp .env.example .env # Cấu hình biến môi trường
   npm start
   ```
4. **Frontend**:
   ```bash
   cd frontend
   npm start
   ```

## 🧪 Testing
```bash
cd backend
node scripts/test_k12_api.js
node scripts/test_phase3.js
node scripts/test_phase4.js
node scripts/test_phase5.js
node scripts/test_phase5_1.js
```

## 📖 Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Web3 Integration](docs/WEB3.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [User Guide](docs/USER_GUIDE.md)
- [Security Audit](docs/SECURITY.md)
- [Known Issues](docs/KNOWN_ISSUES.md)
