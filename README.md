# CNTT_KLCN130_HUIT - Nền Tảng Web3 Giáo Dục Phổ Thông

Hệ thống hỗ trợ quản lý dự án học tập, chấm điểm tiến độ bằng AI và xác thực bất biến chứng nhận kết quả trên Blockchain (Web3) dành cho giáo dục phổ thông.

---

## 📌 Phân Công Công Việc & Kế Hoạch Thực Hiện

- **Phương**: Xây dựng base + giao diện mức cơ bản + Chức năng 5, 6, 7 *(Deadline: 20h Thứ 4, ngày 30/09/2026)*
  - *Phần Base + Giao diện mức cơ bản bàn giao trước 20h Thứ 3, ngày 29/09/2026*
- **Nhi**: Chức năng 1 + 4 *(Deadline: 20h Thứ 6, ngày 02/10/2026)*
- **Nguyên**: Chức năng 2 + 3 *(Deadline: 20h Thứ 6, ngày 02/10/2026)*

---

## 🚀 Kiến Trúc Hệ Thống

1. **Frontend**: React.js, Ant Design, Material-UI, Ethers.js, Socket.IO Client.
2. **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Web3 Authentication (MetaMask).
3. **Smart Contract**: Solidity, Hardhat, Ethers.js (quản lý lưu vết tiến độ, bài nộp IPFS và chứng nhận điểm số).
4. **AI / ML Service**: Python, FastAPI, PhoBERT (phân tích báo cáo), SBERT (gợi ý và so khớp năng lực học sinh với dự án).

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Thử Nghiệm

### 1. Backend (Node.js API)
```bash
cd backend
npm install
npm run dev
# Mặc định chạy tại http://localhost:5000
```

### 2. Frontend (React App)
```bash
cd frontend
npm install
npm start
# Mặc định chạy tại http://localhost:3000
```

### 3. ML Service (AI Analysis & Matching)
```bash
cd ml-service
python -m venv venv
# Kích hoạt venv (Windows: .\venv\Scripts\activate | Linux: source venv/bin/activate)
pip install -r requirements.txt
python app.py
# Mặc định chạy tại http://localhost:8000
```

---

## 👥 Vai Trò Người Dùng Trong Hệ Thống

- **Giáo viên**: Thiết lập dự án học tập / đề tài STEM, quản lý lớp học và môn học, theo dõi tiến độ, chấm điểm bằng AI kết hợp thủ công và xác thực kết quả lên Blockchain.
- **Học sinh**: Đăng nhập bằng ví Web3, cập nhật hồ sơ năng lực, đăng ký dự án theo nhóm hoặc cá nhân, nộp báo cáo và theo dõi phản hồi từ AI và Giáo viên.
- **Ban Quản Trị**: Quản lý xét duyệt tài khoản và giám sát vận hành toàn trường.
