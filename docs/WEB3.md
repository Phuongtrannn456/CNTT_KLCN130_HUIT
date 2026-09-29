# Web3 Integration

## Wallet Ownership
Hệ thống sử dụng Ethers.js và MetaMask để xác thực người dùng. Sinh viên là Holder của ví, Giáo viên (Hệ thống) là Issuer.

## Canonical Payload & Hashing
Để đảm bảo Privacy, dữ liệu PII (Họ tên, Email, Điểm số) không được đưa lên mạng.
Payload được trích xuất (ID, Wallet, Challenge ID), sắp xếp key Alphabet (A-Z), stringify và băm bằng thuật toán Keccak-256.

## The Relayer Mechanism
Sinh viên sử dụng personal_sign trên MetaMask (Miễn phí). Backend sử dụng ví Relayer để gửi transaction kèm chữ ký lên Blockchain.

## On-chain Verification
Truy vấn erifyCredential(bytes32) trả về Hash và thông tin Wallet. Hệ thống so sánh Local DB Hash và Blockchain Hash để đảm bảo toàn vẹn dữ liệu.
