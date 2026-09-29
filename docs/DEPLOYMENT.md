# Deployment Guide

## Prerequisites
- Node.js >= 18
- MongoDB >= 6.0
- Python 3.9+ (For AI Service)
- MetaMask Extension

## Environment Variables
Tạo file .env tại thư mục ackend/ dựa trên .env.example. Đảm bảo các cấu hình JWT_SECRET và RELAYER_PRIVATE_KEY được bảo mật.

## Step-by-Step
1. Chạy MongoDB (mongod --dbpath ...)
2. Deploy Blockchain (Hardhat):
   
px hardhat node
   
px hardhat run scripts/deploy.js --network localhost
   (Cập nhật K12_CREDENTIAL_CONTRACT_ADDRESS vào backend .env)
3. Chạy ML Service (Tùy chọn)
4. Chạy Backend: 
pm start
5. Chạy Frontend: 
pm start

## Testnet Deployment
- Thay đổi BLOCKCHAIN_NETWORK thành Arbitrum Sepolia.
- Khai báo BLOCKCHAIN_RPC_URL (ví dụ: Alchemy/Infura).
- Sử dụng ví có sẵn ETH Testnet làm RELAYER_PRIVATE_KEY.
