# FINAL CLEAN CODE & REFACTORING PLAN (BA MODE)

## 1. TỔNG QUAN VÀ MỤC TIÊU
- **Mục tiêu**: Chuẩn hóa cấu trúc, loại bỏ duplicate code/dead code/console debug, chuẩn hóa error handling và maintainability cho toàn bộ dự án K-12 Web3 Education sau khi Phase 6 đã hoàn thành.
- **Nguyên tắc cốt lõi**:
  - Không thay đổi Business Logic & UX.
  - Không thay đổi API Contract (HTTP method, route, request/response payload, status code).
  - Không thay đổi Database Schema & Collections (giữ nguyên các status `PENDING_CLAIM`, `PENDING_CHAIN`, `ANCHORED`, `FAILED`, `REVOKED`).
  - **KHÓA TUYỆT ĐỐI**: Smart contract `backend/contracts/K12CredentialRegistry.sol` và `backend/utils/canonicalCredential.js` (Canonical Hash Keccak256).
  - Giữ tương thích ngược với legacy routes (`/api/sinhvien`, `/api/giangvien`, `/api/detai`, `/api/baocao`, `/api/dangky`).

---

## 2. BASELINE CHECKLIST & REFACTORING PROTOCOL

### 2.1 Branch Isolation
- Tạo và chuyển sang branch refactoring chuyên biệt:
  ```bash
  git checkout -b refactor/clean-code
  ```
- Tuyệt đối không refactor trực tiếp trên branch `main`.

### 2.2 Baseline Verification (Trước khi Clean Code)
Cần xác nhận các test suite hiện tại đạt 100% PASS:
- **Phase 2A**: 13/13 test cases (Models & Legacy compatibility)
- **Phase 3**: 20/20 test cases (Challenge, Participation, Submission, Rubric Evaluation)
- **Phase 4**: 10/10 test cases (`backend/scripts/test_phase4.js` - AI Recommendations, Analysis, Suggested Evaluation)
- **Phase 5**: 10/10 test cases (`backend/scripts/test_phase5.js` - Web3 Credential Claiming, Keccak256 Hash, Relayer On-Chain, Public Verify)
- **Phase 5.1**: 9/9 test cases (`backend/scripts/test_phase5_1.js` - Replay Attack Protection, Privacy PII Audit, Teacher Revocation)
- **Phase 6**: E2E Full Workflow PASS.

*Nếu baseline chưa PASS -> Dừng ngay, không tiến hành refactor.*

---

## 3. PHẠM VI AUDIT & CÁC HẠNG MỤC CẦN REFACTOR

### 3.1 Backend Audit (`backend/`)
1. **Controllers & Routes**:
   - `authController.js`:
     - Chuẩn hóa xử lý JWT Secret fallback: đảm bảo dùng `process.env.JWT_SECRET` với cảnh báo bảo mật nếu thiếu trong production.
     - Dọn dẹp các debug logs hoặc log dư thừa trong quá trình verify signature/QR session.
   - `credentialController.js`:
     - Giữ nguyên toàn bộ logic chữ ký, nonces, relayer execution, và canonical hash verification.
     - Tách nhỏ hàm helper xử lý kết nối contract nếu cần thiết nhưng giữ nguyên ABI và function signatures.
   - `server.js`:
     - Thay thế các `console.log` còn sót lại bằng `logger.info` / `logger.warn` (nhất là trong socket event `admin:join`, `pending:join`).
     - Đảm bảo các route K-12 và Legacy Route được phân nhóm rõ ràng, có chú thích.

2. **Error Handling & Security**:
   - Kiểm tra toàn bộ khối `try/catch`: không expose stack trace nhạy cảm hoặc database raw errors ra ngoài client.
   - Đảm bảo không có hardcoded private key/credentials trong code ngoài các mock test keys chuẩn của Hardhat.

3. **Console & Debug Cleanup**:
   - Quét và loại bỏ các `console.log('DEBUG: ...')` tạm bời trong quá trình phát triển Phase 1-6.
   - Giữ lại các log nghiệp vụ quan trọng qua Winston logger (`logger.info`, `logger.error`).

### 3.2 Frontend Audit (`frontend/src/`)
1. **Unused Imports & Dead Code**:
   - Quét toàn bộ component trong `components/teacher/`, `components/student/`, `components/shared/`, `components/lecturer/`.
   - Xóa các icon, hook, variable được import nhưng không dùng.
2. **Duplicated Logic & API Services**:
   - Rà soát các hàm gọi API trong `services/` (authService, challengeService, submissionService, credentialService).
   - Đảm bảo token JWT và header Authorization được đính kèm nhất quán.
3. **Component Readability**:
   - Giữ nguyên cấu trúc state & logic UI để tránh breaking changes hoặc re-render cycles không mong muốn.

### 3.3 Web3 & Smart Contract (KHOÁ BẢO MẬT)
- `backend/contracts/K12CredentialRegistry.sol`: Chỉ format/comment, tuyệt đối không đổi storage, modifier hay logic on-chain.
- `backend/utils/canonicalCredential.js`: Không sửa bất kỳ ký tự nào làm thay đổi kết quả canonical JSON serialization và Keccak256 hash.

---

## 4. QUY TRÌNH THỰC HIỆN TỪNG BƯỚC (STEP-BY-STEP REFACTORING)

1. **Bước 1**: Xác nhận Baseline & Tạo branch `refactor/clean-code`.
2. **Bước 2 (Backend Cleanup)**:
   - Dọn dẹp console log, chuẩn hóa logger trong `backend/server.js` và các controllers.
   - Chạy regression test: `node backend/scripts/test_phase4.js`, `test_phase5.js`, `test_phase5_1.js`.
3. **Bước 3 (Frontend Cleanup)**:
   - Dọn dẹp unused imports, dead components, chuẩn hóa formatting trong `frontend/src/`.
   - Kiểm tra build: `npm run build` trong `frontend/`.
4. **Bước 4 (Full Regression Verification)**:
   - Chạy toàn bộ test suites Phase 2A, 3, 4, 5, 5.1, 6.
   - Xác nhận: Tất cả test PASS, API hợp đồng nguyên vẹn, Web3 verification nguyên vẹn.
5. **Bước 5 (Báo cáo & Hoàn tất)**:
   - Xuất Báo cáo Audit & Clean Code tổng hợp (Files modified, logs removed, regression results).
   - Tạo commit sạch trên branch `refactor/clean-code`.

---
*Ghi chú*: Theo Rule 2 trong `AGENTS.md`, mọi thao tác sửa mã nguồn (source code) chỉ được thực hiện khi chuyển sang role **DEV** với lệnh xác nhận **THỰC THI** hoặc **APPLY**.
