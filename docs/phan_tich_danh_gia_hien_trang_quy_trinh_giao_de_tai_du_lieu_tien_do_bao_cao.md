# Phân tích và đánh giá hiện trạng: quy trình giao đề tài, nguồn dữ liệu, theo dõi tiến độ và báo cáo hiện tại

## 1. Khái quát hiện trạng trước khi xây dựng hệ thống

Trước khi có hệ thống hỗ trợ quản lý đề tài tập trung, quy trình giao đề tài và theo dõi quá trình thực hiện đồ án thường được triển khai theo cách phân tán. Giáo viên công bố danh sách đề tài qua nhiều kênh khác nhau như file Excel, biểu mẫu, email, nhóm lớp hoặc thông báo trực tiếp. Học sinh sau đó lựa chọn đề tài, trao đổi với giáo viên, đăng ký thực hiện và chờ xác nhận. Các thông tin liên quan đến đề tài như tên đề tài, mô tả, yêu cầu chuyên môn, số lượng học sinh, giáo viên hướng dẫn, thời hạn nộp bài và trạng thái xét duyệt thường không nằm trong một hệ thống dữ liệu thống nhất.

Trong quy trình truyền thống, dữ liệu phục vụ quản lý đề tài chủ yếu được hình thành từ nhiều nguồn rời rạc. Danh sách học sinh có thể nằm trong file quản lý lớp; danh sách đề tài do từng giáo viên tự lập; thông tin đăng ký được ghi nhận bằng biểu mẫu hoặc bảng tính; tiến độ thực hiện được trao đổi qua tin nhắn, email hoặc các buổi gặp trực tiếp; báo cáo cuối kỳ được nộp qua email, drive hoặc bản in. Cách làm này có thể đáp ứng ở quy mô nhỏ, nhưng khi số lượng học sinh, đề tài và nhóm thực hiện tăng lên, việc kiểm soát trạng thái và đối chiếu dữ liệu trở nên khó khăn.

Đối với quy trình giao đề tài, điểm đáng chú ý là việc lựa chọn đề tài thường phụ thuộc nhiều vào cảm nhận chủ quan của học sinh và sự trao đổi thủ công với giáo viên. Học sinh có thể chưa có đủ thông tin để đánh giá đề tài nào phù hợp với năng lực, kỹ năng và định hướng của mình. Ngược lại, giáo viên cũng khó có cái nhìn nhanh về hồ sơ năng lực của từng học sinh khi xét duyệt. Vì vậy, việc phân bổ đề tài có thể chưa tối ưu, dẫn đến tình trạng học sinh chọn đề tài quá sức, chưa đúng chuyên môn hoặc phải thay đổi sau khi đã bắt đầu.

Đối với theo dõi tiến độ, hiện trạng phổ biến là giáo viên chỉ nắm được kết quả ở một số mốc chính, chẳng hạn khi học sinh báo cáo trực tiếp hoặc gửi tài liệu theo yêu cầu. Các cập nhật nhỏ trong quá trình thực hiện như nghiên cứu tài liệu, thiết kế hệ thống, lập trình, kiểm thử, viết báo cáo hoặc gặp khó khăn kỹ thuật thường không được ghi lại thành lịch sử có cấu trúc. Điều này làm cho quá trình đánh giá mức độ tham gia và tiến bộ của học sinh thiếu dữ liệu khách quan, đặc biệt trong trường hợp đề tài làm theo nhóm.

Đối với báo cáo hiện tại, việc nộp và lưu trữ tài liệu thường phụ thuộc vào kênh nộp mà giáo viên hoặc lớp đang sử dụng. File báo cáo có thể nằm trong email, thư mục drive, máy cá nhân hoặc các nhóm trao đổi. Nếu không có quy ước đặt tên và lưu trữ rõ ràng, giáo viên sẽ khó xác định phiên bản cuối cùng, khó phân biệt bài của từng học sinh hoặc từng nhóm, và khó kiểm tra lại thời điểm nộp. Khi báo cáo đã được chấm, việc bảo đảm file đã nộp và điểm số không bị thay đổi cũng là một vấn đề cần được quan tâm.

## 2. Hạn chế của hiện trạng

Hạn chế đầu tiên là dữ liệu bị phân tán và thiếu tính liên kết. Thông tin học sinh, đề tài, đăng ký, tiến độ, báo cáo và điểm số có thể tồn tại ở nhiều nơi khác nhau. Khi cần kiểm tra một học sinh đang thực hiện đề tài nào, đã được duyệt hay chưa, đã nộp báo cáo chưa hoặc đã được chấm điểm chưa, người quản lý phải đối chiếu qua nhiều nguồn. Việc này tốn thời gian và dễ phát sinh sai sót, nhất là khi có nhiều lớp, nhiều giáo viên hoặc nhiều đợt đăng ký.

Hạn chế thứ hai là quy trình giao đề tài chưa có cơ chế hỗ trợ ra quyết định dựa trên dữ liệu. Trong thực tế, học sinh có năng lực, kỹ năng và định hướng khác nhau, còn mỗi đề tài lại có yêu cầu chuyên môn riêng. Nếu không có hồ sơ năng lực được chuẩn hóa và không có cơ chế so khớp giữa học sinh với yêu cầu đề tài, việc chọn đề tài chủ yếu dựa vào tiêu đề, mô tả ngắn hoặc trao đổi thủ công. Điều này có thể làm giảm mức độ phù hợp giữa người thực hiện và đề tài, ảnh hưởng đến chất lượng đồ án.

Hạn chế thứ ba là việc theo dõi tiến độ chưa phản ánh đầy đủ quá trình làm việc. Một báo cáo cuối kỳ chỉ cho biết kết quả sau cùng, nhưng không thể hiện rõ học sinh đã làm gì trong từng giai đoạn. Với đề tài nhóm, hạn chế này càng rõ hơn vì cùng một sản phẩm cuối có thể không phản ánh đúng mức độ đóng góp của từng thành viên. Nếu thiếu nhật ký tiến độ, giáo viên khó nhận xét kịp thời, khó phát hiện học sinh chậm tiến độ và khó có căn cứ khi đánh giá quá trình.

Hạn chế thứ tư là quá trình nộp báo cáo và quản lý file thiếu khả năng xác thực mạnh. Khi file báo cáo được gửi qua email hoặc các nền tảng lưu trữ thông thường, việc xác định đâu là bản cuối cùng, bản nào được nộp đúng hạn và bản nào đã được dùng để chấm điểm có thể gặp khó khăn. Nếu học sinh được phép thay thế hoặc xóa file sau khi giáo viên đã chấm, dữ liệu giữa bài nộp và điểm số có thể không còn nhất quán. Đây là vấn đề quan trọng đối với các mốc cần tính minh bạch như nộp bài cuối kỳ và công bố điểm.

Hạn chế thứ năm là việc đánh giá nội dung báo cáo phụ thuộc hoàn toàn vào thao tác thủ công của giáo viên. Giáo viên vẫn là người quyết định điểm cuối cùng, nhưng nếu không có công cụ hỗ trợ phân tích nhanh nội dung báo cáo theo yêu cầu đề tài hoặc rubrics, quá trình chấm có thể mất nhiều thời gian. Ngoài ra, việc thiếu dữ liệu hỗ trợ khiến giáo viên khó so sánh mức độ bám đề giữa các bài hoặc đưa ra phản hồi nhất quán cho nhiều học sinh.

## 3. Nguyên nhân của các hạn chế

Nguyên nhân đầu tiên đến từ việc quy trình quản lý đề tài thường được tổ chức theo kinh nghiệm và công cụ văn phòng hơn là theo một hệ thống nghiệp vụ chuyên biệt. Các công cụ như bảng tính, email hoặc thư mục chia sẻ dễ sử dụng, nhưng không được thiết kế để quản lý đầy đủ vòng đời của một đề tài từ lúc công bố, đăng ký, duyệt, thực hiện, nộp báo cáo đến chấm điểm. Vì vậy, chúng thiếu các ràng buộc nghiệp vụ như một học sinh chỉ tham gia một đề tài hợp lệ, đề tài đã duyệt mới được nộp báo cáo, hoặc bài đã chấm thì không được hủy nộp.

Nguyên nhân thứ hai là chưa có mô hình dữ liệu thống nhất cho toàn bộ quy trình. Nếu không định nghĩa rõ các thực thể như học sinh, giáo viên, đề tài, đăng ký đề tài, thành viên nhóm, nhật ký tiến độ, báo cáo và điểm số, hệ thống sẽ khó liên kết dữ liệu. Việc thiếu mã định danh và trạng thái chuẩn hóa làm cho quá trình tra cứu, thống kê và đối chiếu phụ thuộc nhiều vào thao tác thủ công.

Nguyên nhân thứ ba là dữ liệu về năng lực học sinh và yêu cầu đề tài chưa được khai thác hiệu quả. Trong quy trình truyền thống, thông tin như GPA, chuyên ngành, kỹ năng hoặc kinh nghiệm của học sinh thường không được liên kết trực tiếp với danh sách đề tài. Tương tự, yêu cầu công nghệ và tiêu chí đánh giá của đề tài cũng chưa được chuẩn hóa để phục vụ việc gợi ý hoặc phân tích tự động. Vì vậy, hệ thống chưa thể hỗ trợ học sinh chọn đề tài phù hợp hoặc hỗ trợ giáo viên đánh giá bước đầu bằng dữ liệu.

Nguyên nhân thứ tư là chưa có cơ chế lưu dấu đáng tin cậy cho các mốc cuối cùng. Các trạng thái vận hành hằng ngày như đăng ký, sửa thông tin, cập nhật tiến độ có thể thay đổi linh hoạt trong cơ sở dữ liệu. Tuy nhiên, các mốc như nộp báo cáo cuối cùng và chốt điểm cần có khả năng kiểm chứng cao hơn. Nếu toàn bộ dữ liệu chỉ nằm trong nơi lưu trữ có thể sửa đổi, việc chứng minh tính toàn vẹn của file nộp và điểm số sau cùng sẽ gặp hạn chế.

Nguyên nhân thứ năm là thiếu công cụ hỗ trợ giáo viên theo dõi và đánh giá theo thời gian thực. Khi giáo viên chỉ nhận thông tin vào các mốc báo cáo, phản hồi thường đến muộn. Học sinh có thể đi sai hướng trong thời gian dài mà không được phát hiện kịp thời. Đồng thời, giáo viên phải xử lý nhiều báo cáo cùng lúc vào cuối kỳ, dẫn đến áp lực chấm điểm và khó bảo đảm sự nhất quán trong nhận xét.

## 4. Nhu cầu cải tiến

Từ các hạn chế trên, nhu cầu đầu tiên là xây dựng một hệ thống tập trung để quản lý toàn bộ vòng đời của đề tài. Hệ thống cần cho phép giáo viên tạo đề tài với thông tin đầy đủ như mã đề tài, tên đề tài, mô tả, yêu cầu chuyên môn, rubrics, số lượng học sinh và hạn nộp. Học sinh cần có giao diện để xem danh sách đề tài, cập nhật hồ sơ năng lực, đăng ký đề tài và theo dõi trạng thái duyệt. Các trạng thái như chờ duyệt, đã duyệt, từ chối, đã nộp, đã chấm cần được chuẩn hóa để giảm phụ thuộc vào đối chiếu thủ công.

Nhu cầu thứ hai là chuẩn hóa nguồn dữ liệu phục vụ quản lý và đánh giá. Dữ liệu học sinh, giáo viên, đề tài, đăng ký, nhóm, tiến độ, báo cáo và điểm số cần được lưu trong cơ sở dữ liệu có quan hệ tham chiếu rõ ràng. Việc này giúp hệ thống có thể truy vấn nhanh: một học sinh đang ở đề tài nào, một đề tài có những thành viên nào, tiến độ từng học sinh ra sao, báo cáo đã nộp chưa và điểm đã được chốt hay chưa. Đây là nền tảng quan trọng để giảm sai sót và tăng khả năng thống kê.

Nhu cầu thứ ba là bổ sung cơ chế theo dõi tiến độ có cấu trúc. Học sinh cần có nơi cập nhật nhật ký công việc theo từng giai đoạn, kèm phần trăm hoàn thành, loại công việc, liên kết minh chứng và nội dung chi tiết. Giáo viên cần xem được lịch sử này và có thể phản hồi trực tiếp. Cơ chế này giúp chuyển quá trình theo dõi từ trao đổi rời rạc sang dữ liệu có lịch sử, tạo căn cứ tốt hơn cho việc nhận xét quá trình và hỗ trợ học sinh kịp thời.

Nhu cầu thứ tư là cải tiến quy trình nộp và quản lý báo cáo. File báo cáo cần được lưu trữ theo cách có thể truy xuất lại, gắn với học sinh, đề tài và thời điểm nộp. Với đề tài nhóm, hệ thống cần hỗ trợ nộp chung một file nhưng vẫn tạo dữ liệu riêng cho từng thành viên để giáo viên có thể chấm điểm riêng. Sau khi báo cáo đã được chấm, hệ thống cần khóa thao tác hủy nộp để bảo đảm tính nhất quán giữa file đã nộp và kết quả đánh giá.

Nhu cầu thứ năm là ứng dụng AI ở vai trò hỗ trợ, không thay thế giáo viên. Hệ thống cần có khả năng gợi ý đề tài dựa trên hồ sơ năng lực của học sinh và yêu cầu của đề tài, đồng thời hỗ trợ phân tích nội dung báo cáo theo yêu cầu hoặc rubrics. Kết quả AI nên được xem là nguồn tham khảo giúp giáo viên tiết kiệm thời gian và có thêm góc nhìn, trong khi điểm cuối cùng vẫn do giáo viên quyết định.

Nhu cầu thứ sáu là sử dụng blockchain cho các mốc dữ liệu cần tính minh bạch và chống sửa đổi. Không phải mọi thao tác trong hệ thống đều cần đưa lên blockchain, vì các dữ liệu vận hành như hồ sơ, đăng ký hay tiến độ cần được cập nhật linh hoạt. Tuy nhiên, các mốc như ghi nhận mã IPFS của bài nộp và chốt điểm cuối cùng nên có cơ chế lưu dấu để tăng khả năng kiểm chứng. Cách kết hợp giữa cơ sở dữ liệu truyền thống, IPFS và smart contract giúp hệ thống vừa linh hoạt trong quản lý hằng ngày, vừa tăng độ tin cậy cho dữ liệu cuối cùng.

## 5. Đánh giá tổng hợp

Nhìn chung, hiện trạng trước khi có hệ thống cho thấy quy trình giao đề tài, theo dõi tiến độ và nộp báo cáo còn phụ thuộc nhiều vào thao tác thủ công, dữ liệu phân tán và thiếu cơ chế xác thực các mốc quan trọng. Những hạn chế này không chỉ gây khó khăn cho giáo viên trong việc quản lý và đánh giá, mà còn ảnh hưởng đến trải nghiệm của học sinh khi lựa chọn đề tài, cập nhật tiến độ và nộp kết quả. Vì vậy, việc xây dựng một hệ thống quản lý đề tài có cơ sở dữ liệu tập trung, giao diện theo vai trò, nhật ký tiến độ, lưu trữ báo cáo trên IPFS, hỗ trợ AI và ghi nhận blockchain là cần thiết.

Hướng cải tiến này không nhằm thay thế hoàn toàn quy trình chuyên môn của giáo viên, mà nhằm chuẩn hóa dữ liệu, giảm thao tác lặp lại, tăng khả năng theo dõi và nâng cao tính minh bạch. Đây là cơ sở để đề tài tiếp tục triển khai các chức năng quản lý, hỗ trợ đánh giá và xác thực dữ liệu trong các chương tiếp theo của khóa luận.

## Tài liệu và mã nguồn đã tham chiếu

- `analysis_report_advance.md`
- `implementation_planFix.md`
- `notes/nghiep_vu_source_12_04_2026.md`
- `notes/tong_quan_de_tai_ly_do_nhiem_vu_doi_tuong_pham_vi.md`
- `backend/models/DeTai.js`
- `backend/models/DangKyDeTai.js`
- `backend/models/TienDo.js`
- `backend/models/BaoCao.js`
- `backend/controllers/deTaiController.js`
- `backend/controllers/tienDoController.js`
- `backend/controllers/baoCaoController.js`
- `frontend/src/components/student/TopicRegistration.js`
- `frontend/src/components/student/ProgressLog.js`
- `frontend/src/components/student/ReportUpload.js`
- `frontend/src/components/lecturer/SubmissionReview.js`
