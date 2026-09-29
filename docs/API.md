# API Reference

*Note: Authorization is required for most endpoints via JWT (Bearer Token).*

## 1. Authentication
- POST /api/auth/login (Mật khẩu)
- POST /api/auth/challenge & POST /api/auth/verify (MetaMask Wallet)

## 2. K-12 Challenge
- GET /api/challenges
- POST /api/challenges (Teacher only)
- PUT /api/challenges/:id (Owner only)

## 3. Participation & Submission
- POST /api/challenges/:id/join (Student)
- POST /api/participations/:id/submissions (Student)
- POST /api/submissions/:id/evaluate (Teacher)

## 4. AI Integration
- GET /api/ai/recommended-challenges (Student)
- POST /api/ai/submissions/:id/analyze (Teacher)
- POST /api/ai/submissions/:id/evaluate-suggest (Teacher)

## 5. Web3 Credentials
- GET /api/credentials/claim-message/:achievementId (Student - Generate Nonce & ID)
- POST /api/credentials/claim (Student - Post Signature)
- GET /api/credentials/:credentialId/verify (Public - Blockchain verification)
- POST /api/credentials/:credentialId/revoke (Teacher - Revoke credential)
