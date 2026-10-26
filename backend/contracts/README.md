# Smart Contracts Documentation

Hệ thống bao gồm 3 Smart Contracts chính:

- `ThesisManagementV2.sol` — Quản lý đề tài, điểm số, tiến độ
- `K12CredentialRegistry.sol` — Cấp phát chứng chỉ số
- `ThesisManagement.sol` — (Deprecated, giữ tham chiếu)

## Deployment
```bash
cd backend
npx hardhat run scripts/deploy.js --network sepolia
```
