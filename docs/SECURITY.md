# Security Audit

## PII Protection
Không có dữ liệu PII (Họ tên, điểm số, email) nào được xuất hiện trên Public API Xác minh Blockchain hoặc trong Transaction Input trên Chain. 100% Blind Blockchain Model.

## AI Isolation
AI Model (FastAPI) hoạt động dưới dạng REST endpoint. Backend NodeJS là Orchestrator duy nhất có quyền đọc/ghi DB. AI không thể thao túng Điểm số hoặc Blockchain.

## Idempotency & Replay Protection
Quy trình Claim Credential sử dụng Nonce kết hợp Credential ID. Bất kỳ chữ ký nào cũng chỉ được sử dụng một lần (tăng Nonce ngay khi nhận). Nếu giao dịch lỗi Blockchain, Nonce được giữ nguyên và trạng thái trở về PENDING_CLAIM.

## Access Control
JWT Authentication được tích hợp kèm chức năng Role-based (STUDENT_ROLE vs TEACHER_ROLE). Chặn can thiệp chéo (IDOR) một cách triệt để.
