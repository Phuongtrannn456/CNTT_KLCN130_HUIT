---
title: Phase 2A - K-12 Seed & Test Data
date: 2026-09-29
status: completed
---

# Phase 2A - K-12 Seed & Test Data

## Script: `backend/scripts/seed_k12.js`

### Seed Records

#### Teachers (2)
| teacherId | fullName | department | walletAddress |
|---|---|---|---|
| TC_TOAN_01 | Thầy Nguyễn Văn Toàn | Tổ Toán - Tin học | 0x70997970...dc79c8 |
| TC_STEM_02 | Cô Trần Thị Mai | Tổ KHTN & STEM | 0x3c44cddd...4293bc |

#### Students (3)
| studentId | fullName | gradeLevel | school | walletAddress |
|---|---|---|---|---|
| ST_1001 | Lê Minh Khôi | 10 | THPT Nguyễn Trãi | 0x90f79bf6...93b906 |
| ST_1102 | Phạm Thu Hà | 11 | THPT Nguyễn Trãi | 0x15d34aaf...2c6a65 |
| ST_1203 | Trần Quốc Bảo | 12 | THPT Lê Quý Đôn | 0x9965507d...0a4dc |

#### Challenges (4)
| challengeId | subject | eligibleGrades | challengeType | createdBy |
|---|---|---|---|---|
| CHL-STEM-001 | STEM | 10, 11 | STEM | TC_STEM_02 |
| CHL-AI-002 | Tin học | 11, 12 | Project | TC_TOAN_01 |
| CHL-WEB3-003 | Tin học | 10, 11, 12 | Competition | TC_TOAN_01 |
| CHL-MATH-004 | Toán | 10 | Project | TC_TOAN_01 |

### Authentication Note
Wallet addresses là Hardhat default test accounts (deterministic).
Để login thực tế cần ký message bằng private key tương ứng trong Hardhat/MetaMask.
Script không chứa private key nào.

### MongoDB Connection
- Atlas: DNS SRV record ENOTFOUND (cluster hết hạn hoặc network issue)
- Local: MongoDB service Stopped, mongod binary không có trên PATH
- Cần khởi động lại MongoDB local hoặc cập nhật Atlas connection string
