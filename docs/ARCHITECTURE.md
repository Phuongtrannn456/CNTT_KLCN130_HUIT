# System Architecture

## Overview
Hệ thống kết hợp ba tầng công nghệ chính: Web2 (Quản lý nghiệp vụ), ML (Trí tuệ nhân tạo) và Web3 (Chứng thực).

## 1. Web2 Layer
- **MongoDB**: Nguồn sự thật (Source of Truth) cho dữ liệu giáo dục. Đảm bảo toàn vẹn dữ liệu cá nhân (PII).
- **Backend (Node.js)**: Orchestrator chính, kiểm soát Authorization, Validation, tương tác với Blockchain qua Relayer và AI Service qua REST.
- **Frontend (React)**: Giao diện tương tác người dùng, tích hợp MetaMask cho quy trình ký (Signature) Web3.

## 2. Web3 Layer
- **Relayer**: Ví do Backend quản lý (Private Key trong .env) để thay học sinh trả phí Gas (MetaMask Gas-less UX).
- **Smart Contract (K12CredentialRegistry)**: Contract lưu trữ mapping [Credential ID] -> [Metadata Hash, Issuer Wallet, Student Wallet]. Không chứa bất kỳ PII nào.

## 3. AI / ML Layer
- **FastAPI Service**: Cung cấp endpoints nhận dữ liệu text từ Backend để So khớp Challenge (SBERT) và Phân tích Cảm xúc/Ngữ nghĩa (PhoBERT).
- Không có quyền ghi trực tiếp vào MongoDB hay Blockchain. Hoạt động với vai trò ASSISTANT.
