# Task Log: Chuẩn Hóa Domain & Giao Diện Sang Web3 Giáo Dục Phổ Thông

- **Ngày thực hiện:** 29/09/2026
- **Mã đề tài:** `CNTT_KLCN130_HUIT`
- **Tác giả:** Trần Phương

---

## 1. Vấn đề ban đầu
- Mã nguồn kế thừa từ dự án gốc phục vụ đề tài quản lý khóa luận tốt nghiệp của bậc đại học (`Web3GiangVien`), với các từ ngữ như: "Khóa luận tốt nghiệp", "Giảng viên", "Sinh viên", "W3GV".
- Đề tài chính thức của nhóm khóa luận cử nhân CNTT130 HUIT là: **"Xây dựng nền tảng Web3 cho giáo dục phổ thông"**.
- Cần bàn giao phần Base + Giao diện mức cơ bản trước 20h ngày 29/09/2026 cho 2 thành viên khác (Nhi - CN 1+4, Nguyên - CN 2+3) tiếp tục triển khai.

---

## 2. Nguyên nhân & Thách thức kiến trúc
- Nếu sửa đổi trực tiếp tên trường trong Database (MongoDB Schema) và API Routes (`/api/giangvien`, `/api/sinhvien`, `/api/detai`...) sẽ làm vỡ hàng loạt luồng API, JWT Auth Middleware và Smart Contract Solidity (`ThesisManagement.sol`).
- Giải pháp đúng đắn: **Giữ nguyên kiến trúc Core/Backend/Smart Contract, chuẩn hóa toàn diện tầng Giao diện (Frontend UI) và Terminology** sang môi trường Giáo dục phổ thông (K-12 / THPT / THCS).

---

## 3. Khu vực và File đã xử lý

1. **Root & Config:**
   - [`package.json`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/package.json): Cập nhật tên dự án `cntt-klcn130-huit-web3-giao-duc-pho-thong` và mô tả đề tài.
   - [`README.md`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/README.md): Thiết lập tài liệu tổng quan, kiến trúc và phân công deadline rõ ràng cho nhóm (Phương, Nhi, Nguyên).
   - [`.gitignore`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/.gitignore): Ignore thư mục tài liệu nội bộ `Document/`, `.history/` và cấu hình cá nhân `.claude/`.

2. **Frontend UI & Components (Chuẩn hóa 100% nhãn Giáo viên & Học sinh):**
   - [`frontend/public/index.html`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/public/index.html): Đổi title thành `Web3 Giáo Dục Phổ Thông`, cập nhật meta description.
   - [`frontend/public/manifest.json`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/public/manifest.json): Đổi short_name thành `Web3 GDPT`, name thành `Web3 Giáo Dục Phổ Thông`.
   - [`frontend/package.json`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/package.json): Cập nhật tên gói `web3-giao-duc-pho-thong-frontend`.
   - [`frontend/src/components/layout/MainLayout.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/layout/MainLayout.js): Đổi thương hiệu sang `W3PT` / `Web3 Phổ Thông`, cập nhật toàn bộ Menu Học Sinh và Menu Giáo Viên.
   - [`frontend/src/components/LoginPage.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/LoginPage.js): Đổi tiêu đề banner, thông điệp đăng nhập, vai trò hiển thị và footer bản quyền.
   - [`frontend/src/components/RoleSelection.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/RoleSelection.js): Chuyển đổi Card Sinh Viên ➔ Học Sinh, Card Giảng Viên ➔ Giáo Viên, đổi nhãn Chuyên ngành sang Tổ chuyên môn / Môn giảng dạy.
   - [`frontend/src/components/common/ClassSelector.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/common/ClassSelector.js): Đổi nhãn `Khóa luận tốt nghiệp` ➔ `Dự án STEM / Đề tài KHKT`.
   - [`frontend/src/components/lecturer/ClassManagement.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/lecturer/ClassManagement.js): Thay đổi toàn bộ các nhãn thêm học sinh, import danh sách HS, sĩ số lớp, giáo viên hướng dẫn.
   - [`frontend/src/components/lecturer/TopicManagement.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/lecturer/TopicManagement.js): Cập nhật tiêu đề bảng Giáo Viên, cột HS, số lượng HS tối đa, thông báo tạo đề tài cho HS, và cài đặt xem điểm cho HS.
   - [`frontend/src/components/lecturer/SubmissionReview.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/lecturer/SubmissionReview.js): Đổi cột Nhóm / Học Sinh, xác thực Giáo Viên, bước nộp bài và nhận xét của giáo viên.
   - [`frontend/src/components/lecturer/ScoreComparison.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/lecturer/ScoreComparison.js): Đổi Dashboard So Sánh Điểm AI vs Giáo Viên, tab Chi Tiết Học Sinh, bảng điểm và biểu đồ so sánh.
   - [`frontend/src/components/lecturer/CourseManagement.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/lecturer/CourseManagement.js) & [`EntranceTestManager.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/lecturer/EntranceTestManager.js): Đổi cột Giáo Viên Hướng Dẫn, Nhóm / Học Sinh.
   - [`frontend/src/components/student/StudentDashboard.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/student/StudentDashboard.js): Dashboard Học Sinh, Mã HS, Khối lớp/Ban, Điểm Giáo Viên, Giáo viên đứng lớp.
   - [`frontend/src/components/student/TopicRegistration.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/student/TopicRegistration.js): Học sinh tối đa, chờ Giáo viên duyệt, mời Mã Học sinh, thông tin nhóm học sinh.
   - [`frontend/src/components/student/GroupManagement.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/student/GroupManagement.js): Quản lý nhóm học sinh, mời theo Mã Học Sinh.
   - [`frontend/src/components/student/ProgressLog.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/student/ProgressLog.js) & [`ProgressTracking.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/student/ProgressTracking.js): Nhận xét của Giáo viên, Đánh giá Giáo Viên, quy trình duyệt đề tài.
   - [`frontend/src/components/student/ReportUpload.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/student/ReportUpload.js): Thông báo Giáo viên xem và chấm điểm, chờ Giáo viên duyệt.
   - [`frontend/src/components/admin/AdminDashboard.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/admin/AdminDashboard.js) & [`AdminRequests.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/admin/AdminRequests.js) & [`PendingApproval.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/frontend/src/components/PendingApproval.js): Quản trị cấp quyền Giáo viên, duyệt Giáo viên, vào hệ thống với tư cách Học sinh.

3. **Backend Base & API Aliases:**
   - [`backend/package.json`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/backend/package.json): Cập nhật tên `web3-giao-duc-pho-thong-backend`, thêm script `npm run seed:pho-thong`.
   - [`backend/server.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/backend/server.js): Đổi log khởi động sang `Web3 Giáo Dục Phổ Thông API`, bổ sung Dual Route Aliases song song (`/api/giaovien`, `/api/hocsinh`, `/api/duan`).
   - [`backend/models/GiaoVien.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/backend/models/GiaoVien.js), [`backend/models/HocSinh.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/backend/models/HocSinh.js), [`backend/models/DuAn.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/backend/models/DuAn.js): Tạo model alias tương thích chuẩn cho giáo dục phổ thông.
   - [`backend/scripts/seed_giao_duc_pho_thong.js`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/backend/scripts/seed_giao_duc_pho_thong.js): Xây dựng bộ dữ liệu mẫu THPT (Lớp 10A1, 11A2; Môn Toán, Tin, STEM, Lý; Dự án STEM môi trường & AI).
   - [`ml-service/app.py`](file:///E:/KLCN_TRANVIETHUNG_CODE/KLKS14_TranVietHung%20%281%29/KLKS14_TranVietHung/Web3GiangVien/Web3GiangVien/ml-service/app.py): Cập nhật title FastAPI sang `Web3 Giáo Dục Phổ Thông ML Service`.

---

## 4. Kết quả sau khi thực hiện
- 100% giao diện người dùng frontend (toàn bộ các component Giáo viên, Học sinh, Admin, Auth, Debug) đã được thay thế sạch các từ ngữ cũ "Sinh viên" / "Giảng viên" / "Khóa luận tốt nghiệp" sang "Học sinh" / "Giáo viên" / "Dự án STEM & Đề tài KHKT".
- Bảo toàn 100% tính tương thích ngược cho backend database schema và API routes cũ để các thành viên Nhi & Nguyên hoàn toàn không bị ảnh hưởng khi thực hiện các chức năng tiếp theo.
- Nhánh `main` trên GitHub repository `https://github.com/Phuongtrannn456/CNTT_KLCN130_HUIT` đã được cập nhật hoàn tất trước thời hạn 20h ngày 29/09/2026.
