import json
import os
import random

random.seed(42)

def generate_super_realistic_dataset(num_samples=1000):
    # Cac chu de du an STEM K-12 dong bo giua de bai va noi dung bao cao
    topic_specs = [
        {
            "domain": "Vật lý - IoT (ESP32)",
            "topic": "Dự án STEM Vật Lý - IoT: Thiết kế trạm quan trắc bụi mịn PM2.5 và nồng độ khí CO2 tại khuôn viên trường THPT bằng vi điều khiển ESP32.",
            "keywords": ["ESP32", "PM2.5", "CO2", "cảm biến", "sai số", "quan trắc", "đối chứng"],
            "khia_canh": "nguyên lý đo nồng độ bụi mịn PM2.5 bằng cảm biến quang học kết hợp vi điều khiển ESP32",
            "phan_kho": "hiệu chuẩn sai số cảm biến theo độ ẩm môi trường thực tế tại sân trường",
            "bo_cuc": "4 phần chuẩn IMRaD (Mở đầu, Phương pháp thiết kế mạch, Kết quả đo đạc 7 ngày, Kết luận)",
            "tinh_nang_them": "biểu đồ đối chứng nồng độ bụi mịn theo 3 khung giờ cao điểm học sinh tan trường"
        },
        {
            "domain": "Tin học (Thuật toán Python)",
            "topic": "Môn Tin Học K-12: Cài đặt và đánh giá hiệu năng thuật toán Sàng nguyên tố Eratosthenes và Quy hoạch động trên ngôn ngữ Python.",
            "keywords": ["Eratosthenes", "quy hoạch động", "Python", "độ phức tạp", "thời gian chạy", "kiểm thử biên"],
            "khia_canh": "cài đặt thuật toán Sàng nguyên tố Eratosthenes O(n log log n) và tối ưu mảng Quy hoạch động",
            "phan_kho": "phân tích độ phức tạp không gian bộ nhớ và kiểm thử các trường hợp biên khi n = 10^6",
            "bo_cuc": "báo cáo thuật toán kèm mã nguồn Python, bảng đo thời gian thực thi (ms) và nhận xét",
            "tinh_nang_them": "bảng đối chiếu tốc độ chạy giữa vét cạn căn bậc hai và sàng Eratosthenes"
        },
        {
            "domain": "Hóa - Sinh (Lọc nước học đường)",
            "topic": "Dự án STEM Hóa - Sinh: Nghiên cứu hệ thống lọc nước sinh hoạt học đường đa tầng sử dụng vật liệu sinh học than hoạt tính và sỏi thạch anh.",
            "keywords": ["lọc nước", "pH", "than hoạt tính", "độ đục", "thực nghiệm", "đối chứng", "mẫu nước"],
            "khia_canh": "quy trình bố trí 4 tầng vật liệu lọc gồm sỏi thạch anh, cát mangan và than hoạt tính gáo dừa",
            "phan_kho": "đo kiểm định chỉ số pH và độ đục NTU của mẫu nước trước và sau khi qua cột lọc",
            "bo_cuc": "báo cáo thực nghiệm gồm sơ đồ cột lọc, bảng chỉ số pH qua 5 lần thử và kết luận",
            "tinh_nang_them": "bảng phân tích chi phí vật liệu để lắp đặt thử nghiệm tại khu rửa tay học sinh"
        },
        {
            "domain": "Công nghệ - Robotics (Arduino)",
            "topic": "Dự án STEM Công Nghệ - Robotics: Chế tạo mô hình xe tự hành dò line và tránh vật cản bằng cảm biến siêu âm HC-SR04 trên mạch Arduino.",
            "keywords": ["Arduino", "xe tự hành", "HC-SR04", "cảm biến hồng ngoại", "PWM", "mạch cầu H", "thực nghiệm"],
            "khia_canh": "sơ đồ đấu nối mạch cầu H L298N điều khiển động cơ DC và thuật toán đọc cảm biến siêu âm HC-SR04",
            "phan_kho": "điều chỉnh xung PWM để xe không bị trượt khỏi vạch đen ở các góc cua gấp 90 độ",
            "bo_cuc": "hồ sơ thiết kế kỹ thuật gồm sơ đồ mạch điện, lưu đồ thuật toán Arduino và nhật ký chạy thử",
            "tinh_nang_them": "thử nghiệm thực tế 20 vòng liên tục trên sa bàn và thống kê tỷ lệ vượt chướng ngại vật"
        },
        {
            "domain": "Vật lý thực hành (Cơ học)",
            "topic": "Môn Vật Lý K-12: Báo cáo thực hành xác định gia tốc rơi tự do g bằng cổng quang điện và đánh giá sai số phép đo.",
            "keywords": ["gia tốc rơi tự do", "cổng quang điện", "sai số", "đồ thị", "thực nghiệm", "trung bình"],
            "khia_canh": "phương pháp bố trí trụ thép và 2 cổng quang điện nối với đồng hồ hiện số đo thời gian rơi",
            "phan_kho": "tính sai số tuyệt đối, sai số tỷ đối và giải thích nguyên nhân lực cản không khí ảnh hưởng kết quả",
            "bo_cuc": "báo cáo thực hành gồm cơ sở lý thuyết, bảng số liệu 5 độ cao khác nhau và đồ thị s-t^2",
            "tinh_nang_them": "vẽ đường hồi quy tuyến tính trên Excel để suy ra gia tốc g = 9,78 m/s2"
        },
        {
            "domain": "Sinh học - Nông nghiệp số",
            "topic": "Môn Sinh Học - Nông nghiệp số: Theo dõi sinh trưởng cây đậu xanh dưới các bước sóng ánh sáng đèn LED khác nhau trong 14 ngày.",
            "keywords": ["sinh trưởng", "quang hợp", "đèn LED", "chiều cao", "nhật ký", "đối chứng", "sinh khối"],
            "khia_canh": "thiết kế 3 lô thí nghiệm chiếu sáng bằng đèn LED đỏ, LED xanh lam và ánh sáng tự nhiên đối chứng",
            "phan_kho": "giải thích cơ chế hấp thụ phổ ánh sáng của diệp lục a và b ảnh hưởng đến tốc độ vươn lóng",
            "bo_cuc": "nhật ký quan sát 14 ngày liên tục kèm bảng đo chiều cao thân (mm), số lá và ảnh chụp minh chứng",
            "tinh_nang_them": "biểu đồ so sánh tốc độ tăng trưởng sinh khối giữa 3 lô thí nghiệm"
        }
    ]

    good_templates = [
        "Thưa thầy/cô, nhóm em nộp báo cáo hoàn chỉnh. Trong bài, nhóm đã trình bày chi tiết {khia_canh} với đầy đủ số liệu thực nghiệm và kiểm chứng đối chứng. Ở phần {phan_kho}, nhóm đã đo đạc lặp lại nhiều lần để giảm sai số thống kê. Báo cáo tuân thủ đúng {bo_cuc}, đồng thời nhóm bổ sung thêm {tinh_nang_them} giúp kết quả trực quan và sát thực tế học đường.",
        "Nhóm em xin gửi báo cáo dự án STEM. Toàn bộ yêu cầu kỹ thuật gồm {khia_canh} đều được phân tích rõ ràng kèm sơ đồ và mã nguồn. Đối với bài toán {phan_kho}, nhóm đã tra cứu tài liệu chuyên môn và thực nghiệm thành công. Cấu trúc bài viết gồm {bo_cuc} và có mở rộng {tinh_nang_them} để đối chiếu định lượng.",
        "Báo cáo nghiên cứu của nhóm tập trung giải quyết {khia_canh}. Qua quá trình thực nghiệm tại phòng bộ môn, nhóm đã xử lý triệt để vấn đề {phan_kho}. Tài liệu được trình bày theo {bo_cuc}, có đính kèm {tinh_nang_them} và đánh giá giới hạn kỹ thuật của mô hình."
    ]

    avg_templates = [
        "Em gửi báo cáo dự án ạ. Nhóm đã hoàn thành phần {khia_canh} và trình bày theo {bo_cuc}. Tuy nhiên ở mục {phan_kho}, do thời gian thực hành tại phòng thí nghiệm còn hạn chế nên nhóm mới đo được số liệu sơ bộ, chưa kịp bổ sung {tinh_nang_them}.",
        "Thưa thầy/cô, bài làm của nhóm đã nêu được ý chính về {khia_canh} và giữ đúng {bo_cuc}. Riêng phần {phan_kho} nhóm mới giải thích trên lý thuyết chứ chưa kiểm thử hết các trường hợp biên, phần {tinh_nang_them} nhóm xin phép hoàn thiện thêm sau.",
        "Dạ nhóm em nộp bài báo cáo. Các nội dung cơ bản về {khia_canh} đã được viết trong {bo_cuc}. Chỗ {phan_kho} kết quả đo còn dao động nhẹ, và nhóm chưa kịp vẽ {tinh_nang_them} chi tiết như dự kiến."
    ]

    bad_templates = [
        "Thầy/cô ơi tuần này nhóm em vướng lịch kiểm tra nên mới viết tóm tắt được phần {khia_canh}. Phần {phan_kho} và {tinh_nang_them} nhóm chưa làm kịp nên đang để trống. Cấu trúc bài mới có phần mở đầu của {bo_cuc}.",
        "Em nộp bài tạm ạ. Do thiết bị đo của nhóm gặp trục trặc nên phần {khia_canh} không có bảng số liệu thực tế, mục {phan_kho} cũng chưa giải quyết được và thiếu hẳn {bo_cuc}."
    ]

    bs_templates = [
        "Theo tài liệu tổng hợp trên mạng, chủ đề này đóng vai trò rất quan trọng trong cuộc cách mạng công nghiệp. Việc ứng dụng khoa học kỹ thuật giúp nâng cao đời sống. Việc ứng dụng khoa học kỹ thuật giúp nâng cao đời sống. Nhóm xin kết thúc bài báo cáo tại đây.",
        "Hiện nay chuyển đổi số và bảo vệ môi trường là xu hướng chung của thế giới. Mọi học sinh cần tích cực học tập để làm chủ công nghệ. Mọi học sinh cần tích cực học tập để làm chủ công nghệ. Bài viết tham khảo từ nguồn tổng hợp."
    ]

    dataset = []
    for i in range(num_samples):
        spec = topic_specs[i % len(topic_specs)]
        quality_type = random.choices(["good", "avg", "bad", "bs"], weights=[0.38, 0.40, 0.14, 0.08])[0]

        if quality_type == "good":
            template = random.choice(good_templates)
            base_score = random.uniform(8.3, 9.6)
        elif quality_type == "avg":
            template = random.choice(avg_templates)
            base_score = random.uniform(6.6, 8.1)
        elif quality_type == "bad":
            template = random.choice(bad_templates)
            base_score = random.uniform(4.2, 5.9)
        else:
            template = random.choice(bs_templates)
            base_score = random.uniform(3.0, 4.5)

        report = template.format(
            khia_canh=spec["khia_canh"],
            phan_kho=spec["phan_kho"],
            bo_cuc=spec["bo_cuc"],
            tinh_nang_them=spec["tinh_nang_them"]
        )

        kithuat = min(10.0, max(0.0, base_score + random.uniform(-0.3, 0.4)))
        thucnghiem = min(10.0, max(0.0, base_score + random.uniform(-0.4, 0.3)))
        trinhbay = min(10.0, max(0.0, base_score + random.uniform(-0.3, 0.4)))
        final_human_score = round(0.40 * kithuat + 0.35 * thucnghiem + 0.25 * trinhbay, 1)

        dataset.append({
            "id": f"SAMPLE_{i+1:04d}",
            "domain": spec["domain"],
            "quality_tier": quality_type,
            "report_text": report,
            "topic_requirements": spec["topic"],
            "keywords": spec["keywords"],
            "human_score": final_human_score,
            "rubric_scores": {
                "Nội dung & Kiến thức": round(kithuat, 1),
                "Phương pháp & Thực nghiệm": round(thucnghiem, 1),
                "Hình thức & Trình bày": round(trinhbay, 1)
            }
        })

    random.shuffle(dataset)
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "eval_dataset.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(dataset)} clean K-12 STEM grading samples to {out_path}")

if __name__ == "__main__":
    generate_super_realistic_dataset(1000)
