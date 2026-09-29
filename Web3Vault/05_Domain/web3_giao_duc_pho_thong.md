---
title: Chuẩn hóa Domain Web3 Competition cho Giáo dục phổ thông (K-12)
date: 2026-09-29
status: draft
author: BA Agent
---

# Chuẩn hóa Hệ thống Web3 Competition cho Giáo dục Phổ thông (K-12)

Tài liệu này định nghĩa cách ánh xạ và mở rộng hệ thống Web3 + AI Competition Platform (hiện tại đang tập trung vào bậc Đại học/Cao đẳng) sang ngữ cảnh Giáo dục Phổ thông (Cấp 1, Cấp 2, Cấp 3).

## 1. Ánh xạ Thuật ngữ & Domain (Domain Mapping)

Hệ thống hiện hành đang dùng các Entity Đại học. Khi triển khai cho Phổ thông, chúng ta cần chuẩn hóa lại các khái niệm tương đương trên giao diện và (nếu cần) mở rộng schema DB:

| Nền tảng Đại học (Hiện tại) | Nền tảng K-12 (Phổ thông) | Ghi chú & Trường dữ liệu cần bổ sung (Schema Mở rộng) |
| :--- | :--- | :--- |
| `SinhVien` | `HocSinh` | Bổ sung: `khoiLop` (Lớp 1-12), `truongHoc`, `hanhKiem`, `diemTongKet`. Bỏ qua khái niệm `TinChi`. |
| `GiangVien` | `GiaoVien` | Bổ sung: `toBoMon`, `chuNhiemLop` (nếu có). |
| `DeTai` | `DuAnHocTap` / `CuocThi` / `Challenge` | Các cuộc thi STEM, dự án học tập, hoặc bài tập nâng cao. Điều kiện lọc chủ yếu theo `KhoiLop` thay vì `ChuyenNganh`. |
| `ChuyenNganh` | `MonHoc` / `LinhVuc` | Ví dụ: Toán, Lý, Hóa, Sinh, Tin học, Ngữ Văn, Ngoại Ngữ. |
| `GPA` | `DiemTrungBinh` (ĐTB) | ĐTB môn hoặc ĐTB học kỳ/năm học. |

## 2. Competition Workflow trong K-12

Luồng nghiệp vụ cốt lõi không đổi, nhưng điều kiện (Eligibility) sẽ khác:

1. **GiaoVien Setup (Tạo cuộc thi):**
   - Giáo viên tạo `DuAnHocTap`.
   - Thiết lập điều kiện: Ví dụ "Dành cho Khối 10", "Yêu cầu ĐTB môn Tin học > 8.0".
2. **HocSinh Eligibility (Điều kiện tham gia):**
   - AI/Hệ thống lọc tự động: Học sinh lớp 9 không thể đăng ký dự án của lớp 10 (trừ khi dự án cho phép "Vượt cấp").
3. **HocSinh Đăng ký & Nộp bài:**
   - Khuyến khích làm việc nhóm (Team).
   - Có thể cần cơ chế `GiaoVienChuNhiem` xác nhận hoặc phụ huynh đồng thuận (trong tương lai).
4. **AI & Đánh giá (Evaluation):**
   - AI chấm điểm sơ bộ, gợi ý sửa lỗi hành văn/logic phù hợp với lứa tuổi.
   - Giáo viên chấm điểm cuối cùng.

## 3. Đặc thù Web3 cho Học sinh phổ thông

- **MetaMask / Wallet:** Học sinh dưới 18 tuổi có thể gặp khó khăn khi tự quản lý Private Key. Cần cân nhắc cơ chế *Custodial Wallet* (ví do trường/hệ thống quản lý hộ) hoặc ví Multi-sig có phụ huynh/giáo viên.
- **Blockchain Verification:** Ghi nhận thành tích lên chuỗi dưới dạng **Soulbound Token (SBT) / NFT Certificates**. Đây là động lực lớn cho học sinh (ví dụ: Huy hiệu "Giải nhất STEM cấp trường").

## 4. Đặc thù AI / ML cho Học sinh phổ thông

- **Matching System:** AI sẽ gợi ý các Challenge dựa trên điểm mạnh của học sinh (ví dụ: Điểm Toán cao -> Gợi ý dự án Lập trình thuật toán).
- **Phân tích Nội dung (Submission Analysis):** Cần tinh chỉnh prompt/model của AI Service để feedback mang tính chất "Gợi mở" (Socratic method) thay vì chỉ ra đáp án trực tiếp, phù hợp với mục tiêu sư phạm phổ thông.

## 5. Đề xuất Kế hoạch triển khai (Hành động tiếp theo)

Nếu thống nhất với chuẩn hóa này, các bước thực thi (Dev mode) sẽ bao gồm:
1. Tạo Alias ở Frontend để hiển thị "Giáo viên", "Học sinh" dựa trên cấu hình tenant/environment.
2. Bổ sung các field tùy chọn (optional) vào `SinhVien` schema như `khoiLop` (Number: 1-12) để tránh phá vỡ dữ liệu Đại học cũ, hoặc tạo Polymorphic Schema.
3. Cập nhật ML Service để nhận diện field `khoiLop`.
