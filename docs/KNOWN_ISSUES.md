# Known Issues

1. **MetaMask Extension Dependency**: Hệ thống đòi hỏi trình duyệt cài đặt sẵn MetaMask để ký nhận Credential. Sẽ bổ sung hướng dẫn cài đặt UI cho phiên bản sau.
2. **AI Rate Limiting**: Nếu AI Server quá tải, các chức năng AI (Matching/Suggest) sẽ rơi vào trạng thái Graceful Fallback (trả về unavailable), nhưng nghiệp vụ Web2 vẫn chạy bình thường.
3. **Database Backup**: Cần cấu hình cronjob cho mongodump đối với MongoDB production. 
