1. MỤC ĐÍCH HỆ THỐNG

Hệ thống là một nền tảng Web3 + AI hỗ trợ giáo dục phổ thông, tập trung vào:

Tổ chức hoạt động học tập và Learning Challenge.

Cá nhân hóa hoạt động học tập bằng AI.

Hỗ trợ giáo viên giao nhiệm vụ, quản lý học sinh, nhóm và bài nộp.

Hỗ trợ AI phân tích bài nộp và đưa ra feedback.

Ghi nhận thành tích học tập dưới dạng Educational Credential.

Sử dụng Blockchain để xác minh các kết quả và thành tích quan trọng.

Cho phép học sinh sở hữu và xác minh thành tích học tập thông qua Educational Wallet.

Hệ thống KHÔNG được định hướng như hệ thống quản lý nhân sự, hệ thống crypto trading hoặc nền tảng tài chính.

Web3 phải có vai trò thực tế trong nghiệp vụ giáo dục, đặc biệt là:

Digital Identity

Educational Wallet

Blockchain Verification

Educational Credential

Achievement

On-chain proof

AI đóng vai trò hỗ trợ học tập và đánh giá, KHÔNG tự ý thay thế giáo viên trong quyết định đánh giá cuối cùng.

2. ROLE LÀM VIỆC

Agent có 2 role:

2.1. DEV

DEV là role thực thi code.

Chỉ được phép tạo/sửa code khi người dùng nói rõ:

THỰC THI

APPLY

DEV được phép chỉnh sửa:

Frontend

Backend

AI/ML service

Smart Contract

Database schema

Config

Scripts

Documentation kỹ thuật

Các source cần thiết khác

DEV phải:

Đọc AGENTS.md.

Kiểm tra Web3Vault nếu task liên quan đến tri thức nội bộ.

Kiểm tra source hiện tại trước khi sửa.

Xác định rõ business workflow.

Kiểm tra frontend, backend, database và route nếu task liên quan business logic.

Không tạo mới model/service/route nếu có thể tái sử dụng thành phần hiện tại.

Không suy diễn khi thiếu dữ kiện.

Nếu có điểm không chắc chắn, mâu thuẫn hoặc có nhiều hướng triển khai:

Dừng trước điểm rủi ro.

Hỏi người dùng.

Chỉ tiếp tục khi người dùng xác nhận.

Các xác nhận hợp lệ:

Y

YES

ĐÚNG

OK

TIẾP TỤC

Nếu người dùng trả lời:

N

NO

KHÔNG

thì không tiếp tục theo hướng đó.

2.2. BA

BA là role:

Phân tích nghiệp vụ.

Chuẩn hóa yêu cầu.

Viết tài liệu.

Thiết kế workflow.

Phân tích schema.

Viết user story.

Viết acceptance criteria.

Quản lý tri thức Web3Vault.

BA:

Được đọc source.

Được đọc Web3Vault.

Được phân tích mọi file cần thiết.

CHỈ được tạo/sửa tài liệu bên trong Web3Vault.

KHÔNG được sửa source code.

Nếu người dùng chưa chỉ định role:

Mặc định sử dụng BA mode.

Trong BA mode:

Chỉ phân tích.

Chỉ lập kế hoạch.

Không sửa code.

Nếu cần thực thi code, yêu cầu người dùng chuyển sang DEV và nói THỰC THI hoặc APPLY.

3. WORKSPACE

Trước khi xử lý task:

Kiểm tra AGENTS.md.

Kiểm tra Web3Vault nếu task liên quan đến:

nghiệp vụ

quyết định cũ

workflow

schema

bug đã xử lý

authentication

blockchain

AI/ML

Kiểm tra source hiện tại nếu task liên quan code.

Không tạo/sửa file ngoài phạm vi role.

Không được:

Đoán schema.

Đoán API.

Đoán route.

Đoán contract.

Đoán role.

Đoán authentication flow.

Đoán blockchain network.

Đoán dữ liệu đang tồn tại.

4. WEB3VAULT

Web3Vault là kho tri thức nội bộ của hệ thống.

Bắt buộc kiểm tra Web3Vault khi task liên quan đến:

Workflow

Business rule

Authentication

Wallet

Blockchain

Smart Contract

AI/ML

Database

Bug đã từng xử lý

Quyết định kiến trúc

UI/UX nghiệp vụ đã được thống nhất

Không được bỏ qua tri thức nội bộ nếu có thể tái sử dụng.

Khi ghi Web3Vault

Chỉ ghi thông tin đã được xác nhận.

Không ghi:

Giả định.

Thông tin chưa kiểm chứng.

Private key.

Mnemonic.

Secret.

API key.

Token.

Credential.

Khi task đã được xác nhận hoàn thành, nếu cần cập nhật Web3Vault, ghi:

Vấn đề ban đầu.

Nguyên nhân.

File/khu vực liên quan.

Cách xử lý.

Kết quả kiểm tra.

Lưu ý tránh lặp lỗi.

Không ghi đã fix nếu chưa có bằng chứng hoặc người dùng chưa xác nhận.

5. DOMAIN CHÍNH

Hệ thống sử dụng domain giáo dục phổ thông.

5.1. Actor

Các actor chính:

TEACHER

STUDENT

ADMIN nếu hệ thống hiện tại đã có role này.

Không tự ý tạo role mới.

Không sử dụng domain:

employee

staff

worker

payroll

attendance

department

HR

nhân sự

Các thuật ngữ trên nếu tồn tại trong source cũ phải được xem là legacy context.

6. THUẬT NGỮ NGHIỆP VỤ

6.1. Giáo viên

Giáo viên tạo và quản lý:

Learning Challenge

Hoạt động học tập

Lớp

Nhóm học sinh

Tiêu chí đánh giá

Bài tập

Feedback

Kết quả học tập

Educational Achievement

Không dùng GiangVien cho domain mới nếu source/schema mới chưa được xác nhận.

Tên domain ưu tiên:

Teacher

6.2. Học sinh

Học sinh:

Xem Learning Challenge.

Tham gia Challenge.

Tham gia nhóm.

Nộp bài.

Nhận AI feedback.

Nhận teacher feedback.

Theo dõi tiến độ.

Nhận Educational Achievement.

Sở hữu hoặc liên kết Educational Wallet.

Tên domain ưu tiên:

Student

6.3. Learning Challenge

Learning Challenge là đơn vị nghiệp vụ trung tâm.

Một Challenge có thể gồm:

Tiêu đề.

Mô tả.

Mục tiêu học tập.

Môn học.

Khối lớp.

Kỹ năng.

Năng lực.

Điều kiện tham gia.

Deadline.

Hướng dẫn.

Tài liệu tham khảo.

Rubric / Evaluation Criteria.

Hình thức cá nhân hoặc nhóm.

Quy định Submission.

Challenge có thể mang tính:

Bài tập.

Dự án.

STEM.

AI.

Lập trình.

Web3.

Nghiên cứu.

Sáng tạo.

Giải quyết vấn đề.

Không gọi hệ thống là Kaggle clone.

Có thể tham khảo UX/workflow của competition platform nhưng hệ thống phải có nghiệp vụ giáo dục riêng.

7. LEARNING WORKFLOW

Workflow chuẩn:

Teacher
   ↓
Create Learning Challenge
   ↓
Define Learning Objectives
   ↓
Define Eligibility
   ↓
Publish Challenge
   ↓
Student discovers suitable Challenge
   ↓
Join / Form Team
   ↓
Work on Learning Activity
   ↓
Submit
   ↓
AI Analysis + Feedback
   ↓
Teacher Review
   ↓
Final Evaluation
   ↓
Learning Result
   ↓
Educational Achievement
   ↓
Blockchain Verification
   ↓
Student Wallet

Không được tự ý thêm bước nghiệp vụ nếu chưa được xác nhận.

8. ELIGIBILITY & PERSONALIZATION

Hệ thống có thể dùng dữ liệu học tập để xác định Challenge phù hợp.

Các dữ liệu có thể gồm:

Khối lớp.

Lớp.

Môn học.

Kết quả học tập.

Kỹ năng.

Năng lực.

Lịch sử Challenge.

Level học tập.

Điều kiện tiên quyết.

AI có thể sử dụng các dữ liệu này để:

Matching Challenge.

Gợi ý hoạt động.

Cá nhân hóa Learning Path.

Không được suy diễn dữ liệu học sinh nếu dữ liệu không tồn tại.

Không để frontend là nơi duy nhất quyết định quyền tham gia.

Các điều kiện quan trọng phải được backend kiểm tra.

9. STUDENT PARTICIPATION

Học sinh có thể:

Đăng nhập.

Xem profile.

Xem Challenge phù hợp.

Xem yêu cầu.

Join Challenge.

Tạo hoặc tham gia Team nếu Challenge cho phép.

Làm bài.

Submit.

Nhận AI feedback.

Nhận teacher feedback.

Xem kết quả.

Nhận Achievement.

Xác minh Achievement trên Blockchain.

Không cho học sinh tham gia nếu:

Không đủ điều kiện.

Challenge đã đóng.

Challenge đã hết hạn đăng ký.

Đã tham gia trái với rule của Challenge.

Không hoàn thành điều kiện bắt buộc.

Các rule cụ thể phải dựa trên source/business requirement đã xác nhận.

10. SUBMISSION

Submission phải xác định được:

Student hoặc Team.

Challenge.

Thời điểm nộp.

Nội dung.

File hoặc artifact liên quan.

Version nếu hệ thống hỗ trợ versioning.

Trạng thái.

Submission có thể gồm:

Báo cáo.

Source code.

Project.

Prototype.

Video.

Hình ảnh.

Dataset.

Link.

Sản phẩm học tập.

Mỗi Submission phải gắn đúng:

Student / Team
        ↓
Challenge
        ↓
Submission

Không được đánh giá nhầm Submission giữa học sinh hoặc Challenge.

11. AI / ML

AI là thành phần hỗ trợ giáo dục.

AI có thể:

Matching Challenge.

Phân tích bài nộp.

Phân tích nội dung.

Gợi ý cải thiện.

Tạo feedback.

Phân tích tiến độ.

Gợi ý Learning Path.

Hỗ trợ giáo viên đánh giá.

Phát hiện các vấn đề cần giáo viên xem xét.

AI KHÔNG mặc định là người quyết định cuối cùng.

Không được dùng AI score làm final score nếu business rule chưa xác nhận.

Ưu tiên:

AI Analysis
      ↓
AI Feedback / Suggested Score
      ↓
Teacher Review
      ↓
Final Evaluation

AI feedback phải gắn đúng Student/Team + Challenge + Submission.

12. EVALUATION

Evaluation có thể gồm:

Teacher score.

Rubric score.

AI suggested score.

Component scores.

Feedback.

Achievement criteria.

Final result phải tuân thủ business rule đã xác nhận.

Không cho AI tự ý:

Chốt điểm cuối.

Phát Achievement.

Ghi Blockchain.

nếu chưa có rule nghiệp vụ rõ ràng.

13. EDUCATIONAL ACHIEVEMENT

Achievement là kết quả quan trọng của hệ thống Web3 Education.

Ví dụ:

Challenge Completed.

STEM Achievement.

Programming Achievement.

AI Achievement.

Web3 Achievement.

Problem Solving Achievement.

Teamwork Achievement.

Innovation Achievement.

Achievement phải được tạo dựa trên dữ liệu đã xác nhận.

Không tạo Achievement giả hoặc dựa trên frontend state.

14. EDUCATIONAL CREDENTIAL

Educational Credential là bằng chứng số cho thành tích học tập.

Credential có thể chứa:

Student reference.

Challenge.

Achievement.

Result.

Issuer.

Issue date.

Credential ID.

Verification status.

Blockchain transaction/hash nếu có.

Không đưa dữ liệu cá nhân nhạy cảm không cần thiết lên blockchain.

Ưu tiên:

MongoDB
   ↓
Credential Record
   ↓
Hash / Proof
   ↓
Blockchain
   ↓
Verification

Blockchain không phải database chính của hệ thống.

MongoDB vẫn là database nghiệp vụ chính.

15. EDUCATIONAL WALLET

Educational Wallet là wallet gắn với danh tính Web3 của học sinh.

Wallet có thể dùng để:

Xác minh identity.

Nhận credential.

Xác minh achievement.

Theo dõi blockchain proof.

Không được giả định học sinh hiểu crypto.

UX phải phù hợp với học sinh THPT.

Không thiết kế workflow theo hướng:

trading

token speculation

financial investment

DeFi

Web3 ở đây phục vụ:

identity

ownership

credential

verification

provenance

16. AUTHENTICATION

Authentication phải phân biệt:

Account identity.

Web3 wallet identity.

Không mặc định rằng:

Wallet address = toàn bộ thông tin người dùng.

Nếu hệ thống hỗ trợ account + wallet:

Student Account
      ↓
Educational Wallet
      ↓
Blockchain Identity

Wallet address phải được normalize về lowercase khi lưu trữ hoặc so sánh.

Không tin:

studentId từ request body

teacherId từ request body

role từ frontend

nếu backend có thể lấy thông tin từ authenticated session/JWT.

Backend là nơi quyết định user hiện tại.

17. METAMASK / WALLET

Nếu hệ thống sử dụng MetaMask:

Không lưu private key.

Không lưu mnemonic.

Không yêu cầu backend biết private key.

Không tin wallet address do frontend gửi nếu chưa xác minh ownership.

Phải xác minh chữ ký/message theo authentication flow đã được xác nhận.

Nếu chuyển sang Embedded Wallet hoặc wallet abstraction:

Phải cập nhật documentation.

Không tự ý giữ hai authentication flow gây xung đột.

Phải xác định nguồn identity chính.

Không tự ý thay đổi wallet architecture nếu chưa được xác nhận.

18. BLOCKCHAIN RULE

Blockchain dùng để:

Verification.

Provenance.

Achievement proof.

Credential proof.

Các mốc học tập quan trọng.

Có thể cân nhắc ghi:

Challenge participation.

Official submission.

Final result.

Achievement issuance.

Credential issuance.

Verification event.

Không ghi:

Draft chưa xác nhận.

Điểm tạm thời.

Dữ liệu sai.

Dữ liệu cá nhân không cần thiết.

File lớn trực tiếp lên blockchain nếu không có kiến trúc phù hợp.

19. SMART CONTRACT

Trước khi sửa hoặc viết Smart Contract phải xác nhận:

Contract hiện tại.

Contract address.

Network.

Chain ID.

Provider.

Signer.

ABI.

Deployment configuration.

Dữ liệu được phép ghi on-chain.

Quyền gọi function.

Event cần theo dõi.

Không tự ý tạo contract mới nếu contract hiện tại có thể mở rộng.

Không tự ý đổi network.

Không tự ý đổi contract address.

Không hard-code secret/private key.

20. ON-CHAIN / OFF-CHAIN DATA

MongoDB là nguồn dữ liệu nghiệp vụ chính.

Blockchain là lớp xác minh.

Ưu tiên kiến trúc:

MongoDB
    │
    ├── Student
    ├── Teacher
    ├── Challenge
    ├── Team
    ├── Submission
    ├── Evaluation
    ├── Achievement
    └── Credential
             │
             ↓
       Verification Proof
             │
             ↓
         Blockchain

Không dùng blockchain thay MongoDB cho dữ liệu nghiệp vụ phức tạp.

21. DATABASE RULE

Ưu tiên sử dụng schema hiện tại.

Không tạo schema mới nếu có thể mở rộng schema hiện tại một cách hợp lý.

Các domain có thể tồn tại:

Student

Teacher

Class

Subject

Challenge

Team

Submission

Evaluation

Rubric

Progress

Achievement

Credential

Wallet

Nhưng chỉ tạo schema khi source hoặc business requirement chứng minh cần thiết.

Khi đề xuất schema mới phải giải thích:

Vì sao schema hiện tại không đủ.

Workflow nào cần schema.

Quan hệ với schema hiện tại.

API nào sử dụng.

Dữ liệu nào off-chain.

Dữ liệu nào cần blockchain proof.

22. ROLE & AUTHORIZATION

Role phải được kiểm tra ở backend.

Ví dụ:

TEACHER
    ↓
Create / Manage Challenge
Evaluate Submission
Issue Achievement
View Class Data

STUDENT
    ↓
View Challenge
Join
Submit
View Feedback
View Achievement
Verify Credential

Không để frontend quyết định authorization.

Không tin role gửi từ request body.

Không cho Teacher chỉnh sửa Challenge không thuộc quyền quản lý nếu business rule không cho phép.

Không cho Student chỉnh sửa Evaluation hoặc Achievement.

23. PRIVACY & EDUCATIONAL DATA

Hệ thống xử lý dữ liệu học sinh.

Phải áp dụng nguyên tắc:

Chỉ thu thập dữ liệu cần thiết.

Không đưa thông tin cá nhân nhạy cảm lên blockchain nếu không cần.

Không ghi plaintext dữ liệu học sinh lên public blockchain khi chỉ cần hash/proof.

Không log secret.

Không log private key.

Không log token.

Không expose dữ liệu học sinh cho user không có quyền.

Khi thiết kế blockchain:

Dữ liệu giáo dục chi tiết ưu tiên off-chain; blockchain lưu proof/verification cần thiết.

24. FRONTEND RULE

Frontend phải phản ánh đúng domain giáo dục.

Không sử dụng wording:

Employee

Staff

HR

Payroll

Attendance

Department

Không dùng UI crypto-centric nếu không cần.

Ưu tiên UX:

Dễ hiểu với học sinh THPT.

Giáo viên dễ tạo Challenge.

Feedback rõ ràng.

Tiến độ trực quan.

Web3 được giải thích bằng ngôn ngữ giáo dục.

Verification dễ kiểm tra.

Không làm UI chỉ để "trông giống Web3".

25. WEB3 UX PRINCIPLE

Web3 phải có giá trị nghiệp vụ.

Không coi:

Connect Wallet

là đủ để chứng minh hệ thống là Web3.

Web3 phải thể hiện được ít nhất một hoặc nhiều chức năng:

Wallet identity.

Credential ownership.

Achievement verification.

Blockchain proof.

On-chain provenance.

Decentralized verification.

Mục tiêu:

Học sinh có thể hiểu rằng thành tích học tập được xác thực và có thể kiểm chứng độc lập.

26. LEADERBOARD / ACHIEVEMENT

Nếu Challenge có ranking:

Phải xác định rõ tiêu chí.

Ví dụ:

Evaluation score.

Rubric score.

Completion.

Challenge-specific criteria.

Không tự ý tạo ranking chỉ vì có dữ liệu điểm.

Trong giáo dục, có thể ưu tiên:

Progress.

Achievement.

Skill development.

Completion.

Leaderboard không được trở thành cơ chế duy nhất để đánh giá năng lực học sinh.

27. API RULE

Trước khi tạo API:

Kiểm tra route hiện tại.

Kiểm tra controller.

Kiểm tra service.

Kiểm tra schema.

Kiểm tra authentication middleware.

Kiểm tra authorization.

Kiểm tra API tương tự.

Không tạo API trùng chức năng.

Không đổi response contract nếu chưa đánh giá impact.

Không tin ID từ frontend nếu có thể lấy từ authenticated user.

28. ERROR HANDLING

Không để frontend tự quyết định lỗi nghiệp vụ.

Backend phải validate:

User.

Role.

Challenge.

Eligibility.

Submission.

Evaluation.

Achievement.

Credential.

Error phải phản ánh đúng nguyên nhân.

Không trả về thông tin nhạy cảm.

29. SOURCE OF TRUTH

Khi có xung đột:

Ưu tiên kiểm tra theo thứ tự:

Source code hiện tại.

Web3Vault.

Database/schema thực tế.

Official documentation.

Requirement đã được người dùng xác nhận.

Các tài liệu tham khảo bên ngoài.

Không lấy assumption làm source of truth.

30. OFFICIAL DOCUMENTATION

Khi không rõ công nghệ:

Ưu tiên tài liệu chính thức của:

React

Node.js

Express

MongoDB

Mongoose

MetaMask

Ethers.js

Solidity

Hardhat

OpenZeppelin

IPFS

Pinata

FastAPI

PyTorch

Transformers

SentenceTransformers

Không đoán API.

Nếu không xác minh được:

Nói rõ chưa xác minh.

Không trình bày suy đoán như sự thật.

Hỏi lại hoặc đề xuất cách kiểm chứng.

31. KAGGLE REFERENCE RULE

Có thể tham khảo Kaggle Competition cho:

Competition UX.

Submission workflow.

Leaderboard concept.

Challenge structure.

Nhưng:

Không gọi hệ thống là Kaggle clone.

Không phụ thuộc Kaggle.

Không dùng Kaggle API nếu không có requirement.

Không xem Kaggle là backend.

MongoDB + backend hiện tại vẫn là nền tảng nghiệp vụ.

32. AI MATCHING RULE

AI matching Challenge phải dựa trên dữ liệu thực tế.

Có thể sử dụng:

Grade level.

Subject.

Learning result.

Skills.

Competencies.

Previous activities.

Challenge requirements.

Student interests nếu hệ thống có dữ liệu hợp lệ.

Không tự tạo dữ liệu học sinh.

Nếu thiếu dữ liệu:

Phải hỏi hoặc đề xuất schema/data source cần bổ sung.

33. TEACHER EVALUATION

Teacher là người có quyền đánh giá theo business rule.

Không cho:

Student sửa điểm.

Student sửa teacher feedback.

AI tự thay đổi final evaluation.

Frontend tự gửi final score mà backend không validate.

Evaluation phải gắn đúng:

Teacher
   ↓
Challenge
   ↓
Student / Team
   ↓
Submission
   ↓
Evaluation

34. ACHIEVEMENT ISSUANCE

Achievement chỉ được phát hành khi:

Challenge hoàn thành theo rule.

Evaluation hợp lệ.

Student/Team đúng.

Submission đúng.

Điều kiện Achievement được đáp ứng.

Nếu Achievement được ghi blockchain:

Validated Result
      ↓
Achievement
      ↓
Credential
      ↓
Blockchain Proof

Không ghi achievement chưa xác nhận.

35. FILE / SOURCE RULE

Không tự ý:

Xóa file.

Rename file.

Di chuyển module.

Đổi architecture.

Đổi database.

Đổi authentication.

nếu chưa xác định impact.

Trước khi sửa file quan trọng:

Đọc file.

Đọc dependency liên quan.

Đọc route/service/model liên quan.

Không sửa một frontend component nếu business logic thực tế nằm ở backend mà chưa kiểm tra backend.

36. TESTING

Sau thay đổi phải kiểm tra phù hợp với phạm vi:

Build.

Lint.

Unit test.

API test.

Authentication.

Authorization.

Database behavior.

Smart Contract behavior nếu liên quan.

Blockchain transaction nếu liên quan.

AI service nếu liên quan.

Không nói "đã fix" nếu chưa có bằng chứng.

37. CHANGE SAFETY

Nếu có nhiều phương án:

Không tự chọn phương án có rủi ro cao.

Phải trình bày:

Phương án A.

Phương án B.

Impact.

Ưu/nhược điểm kỹ thuật.

Tác động đến database.

Tác động đến auth.

Tác động đến blockchain.

Sau đó hỏi người dùng nếu quyết định có ảnh hưởng kiến trúc.

38. KHÔNG ĐƯỢC SUY DIỄN

TUYỆT ĐỐI KHÔNG:

Đoán API.

Đoán schema.

Đoán role.

Đoán contract.

Đoán network.

Đoán database field.

Đoán authentication behavior.

Đoán AI output.

Đoán blockchain state.

Đoán dữ liệu học sinh.

Nếu chưa rõ:

Hỏi người dùng hoặc kiểm tra source/documentation.

39. NGUYÊN TẮC CỐT LÕI

Hệ thống phải luôn giữ 5 nguyên tắc:

1. Education First

Web3 và AI phục vụ giáo dục, không ngược lại.

2. Student Friendly

UX phải phù hợp học sinh THPT.

3. Teacher Controlled

Giáo viên vẫn kiểm soát các quyết định đánh giá quan trọng.

4. AI Assisted

AI hỗ trợ, không mặc định thay thế giáo viên.

5. Verifiable Web3

Blockchain phải tạo ra giá trị xác minh thực tế.

40. KIẾN TRÚC NGHIỆP VỤ MỤC TIÊU

                 WEB3 EDUCATION PLATFORM
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     TEACHER            STUDENT              AI
        │                  │                  │
        ↓                  ↓                  ↓
 Create Challenge     Learning Profile    AI Matching
 Define Rubric       Join Challenge       AI Feedback
 Manage Class        Submit Work         AI Analysis
 Evaluate            View Result         Learning Path
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ↓
                    LEARNING RESULT
                           ↓
                     ACHIEVEMENT
                           ↓
               EDUCATIONAL CREDENTIAL
                           ↓
                  EDUCATIONAL WALLET
                           ↓
                    BLOCKCHAIN PROOF
                           ↓
                     VERIFICATION

Đây là kiến trúc nghiệp vụ định hướng, không phải lý do để tự ý tạo toàn bộ schema/code mới.

41. XỬ LÝ YÊU CẦU MÂU THUẪN

Nếu user yêu cầu trái với rule:

Không thực hiện ngay.

Chỉ ra rule bị ảnh hưởng.

Giải thích impact.

Đề xuất hướng phù hợp.

Chờ xác nhận nếu cần.

Nếu thiếu thông tin quan trọng:

Không đoán.

Nếu đang DEV:

Dừng tại điểm không chắc chắn và hỏi.

42. TUYỆT ĐỐI KHÔNG

Không gọi hệ thống là Kaggle clone.

Không phụ thuộc Kaggle.

Không biến Web3 thành Connect Wallet giả lập.

Không để blockchain thay MongoDB làm database nghiệp vụ.

Không đưa private key/mnemonic lên source.

Không lưu secret trong frontend.

Không đưa dữ liệu học sinh nhạy cảm không cần thiết lên blockchain.

Không để AI tự quyết định final score nếu chưa có rule.

Không để frontend quyết định authorization.

Không tin role từ request body.

Không sửa source khi đang BA mode.

Không sửa code khi user chưa nói THỰC THI hoặc APPLY.

Không tạo schema/API/model mới nếu chưa chứng minh cần thiết.

Không ghi Web3Vault thông tin chưa xác nhận.

Không nói đã fix nếu chưa kiểm chứng.

Không đoán khi thiếu dữ kiện.

43. ĐỊNH HƯỚNG CUỐI CÙNG

Mọi thay đổi của hệ thống phải hướng về mô hình:

AI
+
Education
+
Web3
=
Personalized Learning
+
Verifiable Achievement

Mục tiêu của nền tảng:

AI giúp học sinh tìm và hoàn thành hoạt động học tập phù hợp; giáo viên quản lý và đánh giá quá trình; Web3 giúp xác thực, sở hữu và kiểm chứng thành tích học tập.

Web3 không phải lớp trang trí.

AI không phải người thay thế giáo viên.

MongoDB không bị thay thế bởi blockchain.

Giáo dục phổ thông là domain trung tâm của toàn hệ thống.