import json
import random

def generate_super_realistic_dataset(num_samples=500):
    # CÁC CHỦ ĐỀ/BÀI TẬP (Dành cho Học Sinh Phổ Thông K-12)
    topics = [
        "Môn Ngữ Văn: Viết bài văn nghị luận (500 chữ) về tác hại của rác thải nhựa đối với môi trường biển.",
        "Môn Tin Học: Thiết kế một trang web HTML/CSS tĩnh gồm 3 trang giới thiệu về danh lam thắng cảnh quê hương.",
        "Môn Vật Lý: Báo cáo thực hành đo gia tốc rơi tự do. Yêu cầu có bảng số liệu, vẽ đồ thị và nhận xét sai số.",
        "Môn Lịch Sử: Làm file thuyết trình (Slide) tóm tắt diễn biến và ý nghĩa lịch sử của chiến dịch Điện Biên Phủ.",
        "Môn Sinh Học: Trồng hạt đậu xanh và ghi chép nhật ký phát triển trong 7 ngày, có chụp ảnh minh họa.",
        "Môn Tiếng Anh: Viết đoạn văn (150 từ) kể về kỳ nghỉ hè đáng nhớ nhất của em.",
        "Ngoại khóa: Lập kế hoạch tổ chức sự kiện thu gom giấy vụn gây quỹ từ thiện của lớp."
    ]

    # VĂN PHONG HỌC SINH GIỎI (Điểm 8.5 - 10)
    # Đặc điểm: Làm đủ yêu cầu, chi tiết, có mở rộng, ngoan ngoãn.
    good_templates = [
        "Thưa thầy/cô, em đã hoàn thành bài tập theo đúng yêu cầu. Trong bài, em tập trung phân tích kỹ {khia_canh} và đưa ra nhiều dẫn chứng cụ thể. Ở phần {phan_kho}, em có tham khảo thêm sách nâng cao để làm rõ vấn đề. Hình ảnh/số liệu được em đính kèm đầy đủ ở phụ lục ạ.",
        "Em nộp bài ạ. Bài làm của em gồm {bo_cuc}. Điểm nhấn của bài là em đã tự làm thêm {tinh_nang_them} để bài sinh động hơn. Chỗ {phan_kho} ban đầu hơi khó nhưng sau khi đọc kỹ SGK em đã giải quyết được. Mong thầy cô nhận xét thêm cho em.",
        "Dạ em gửi báo cáo. Mọi yêu cầu như {khia_canh} em đều đã thực hiện chi tiết. Đặc biệt em có kẻ bảng so sánh và vẽ biểu đồ rất rõ ràng. Phần kết luận em tự rút ra bài học thực tiễn cho bản thân."
    ]

    # VĂN PHONG HỌC SINH KHÁ/TRUNG BÌNH (Điểm 6.5 - 8.0)
    # Đặc điểm: Làm đủ mức cơ bản, hơi ngắn, lười mở rộng.
    avg_templates = [
        "Em gửi bài tập. Em đã làm xong {khia_canh} nhưng phần {phan_kho} khó quá em chỉ viết được một đoạn ngắn. Bài làm em trình bày đủ {bo_cuc} như cô dặn trên lớp.",
        "Thưa thầy em nộp bài. Ý chính về {khia_canh} em đã nêu ra, nhưng em chưa kịp chèn ảnh minh họa. Về phần {phan_kho} em có viết theo ý hiểu của mình, có gì thầy sửa lỗi giúp em ạ.",
        "Dạ bài làm của em đây ạ. Chỗ {tinh_nang_them} em không biết làm nên bỏ qua. Các phần bắt buộc khác em đã làm đủ. Chữ em hơi xấu thầy cố gắng đọc giúp em."
    ]

    # VĂN PHONG YẾU/KÉM (Điểm 3.0 - 6.0)
    # Đặc điểm: Than vãn, làm thiếu nhiều, đối phó.
    bad_templates = [
        "Thầy ơi dạo này nhiều bài tập quá em làm chưa kịp. Em mới viết được cái Mở bài và phần {khia_canh}. Phần {phan_kho} em để trống do chưa biết cách giải. Thầy cho em nợ sang tuần nhé.",
        "Em nộp tạm bài này ạ. Do hỏng máy tính nên em chưa làm được {tinh_nang_them}. Bài hơi ngắn vì em không tìm được tài liệu về {khia_canh}.",
        "Cô ơi phần {phan_kho} trong sách không có dạy sao cô ra đề khó vậy ạ? Em chỉ làm được một nửa. Mong cô chấm lỏng tay cho em qua môn."
    ]

    # VĂN PHONG COPY/PASTE WIKIPEDIA (Điểm 4.0 - 5.5)
    # Đặc điểm: Câu cú copy trên mạng không ăn nhập đề bài.
    bs_templates = [
        "Theo Wikipedia, vấn đề này là một hiện tượng phổ biến trong tự nhiên. Nó được khám phá vào thế kỷ 19 bởi các nhà khoa học. (Em copy một đoạn trên mạng dán vào do không có thời gian viết). Xin hết.",
        "Như chúng ta đã biết, đây là một chủ đề rất rộng lớn và bao la. Việc nghiên cứu nó đòi hỏi sự đầu tư về trí tuệ và vật chất. Tóm lại, điều này rất quan trọng đối với đời sống con người."
    ]

    # Kho từ thay thế linh hoạt theo đặc thù môn phổ thông
    khia_canh_list = ["thực trạng rác thải", "code CSS phần Header", "bảng số liệu thời gian", "nguyên nhân chiến thắng", "quá trình nảy mầm", "từ vựng miêu tả chuyến đi", "ngân sách dự kiến"]
    phan_kho_list = ["biện pháp khắc phục", "căn giữa các thẻ div", "tính sai số tuyệt đối", "ý nghĩa lịch sử", "giải thích hiện tượng lá vàng", "sử dụng thì quá khứ hoàn thành", "kêu gọi tài trợ"]
    bo_cuc_list = ["3 phần Mở-Thân-Kết", "3 trang HTML index, about, contact", "đủ các bước thí nghiệm", "15 slide thuyết trình", "nhật ký 7 ngày", "đoạn văn 15 dòng", "bảng kế hoạch 4 cột"]
    tinh_nang_them_list = ["liên hệ bản thân", "hiệu ứng hover CSS", "đồ thị trên Excel", "chèn video tư liệu", "vẽ biểu đồ sinh trưởng", "chèn hình ảnh kỳ nghỉ", "làm form đăng ký online"]

    dataset = []
    
    for i in range(num_samples):
        topic = random.choice(topics)
        
        quality_type = random.choices(["good", "avg", "bad", "bs"], weights=[0.30, 0.45, 0.15, 0.10])[0]
        
        if quality_type == "good":
            template = random.choice(good_templates)
            base_score = random.uniform(8.5, 9.8)
        elif quality_type == "avg":
            template = random.choice(avg_templates)
            base_score = random.uniform(6.5, 8.2)
        elif quality_type == "bad":
            template = random.choice(bad_templates)
            base_score = random.uniform(3.0, 6.0)
        else:
            template = random.choice(bs_templates)
            base_score = random.uniform(4.0, 5.5)
            
        report = template.format(
            khia_canh=random.choice(khia_canh_list),
            phan_kho=random.choice(phan_kho_list),
            bo_cuc=random.choice(bo_cuc_list),
            tinh_nang_them=random.choice(tinh_nang_them_list)
        )
        
        # Tính điểm thành phần (chênh lệch chút đỉnh so với base)
        kithuat = min(10, max(0, base_score + random.uniform(-0.5, 0.5)))
        trinhbay = min(10, max(0, base_score + random.uniform(-1, 1)))
        thucnghiem = min(10, max(0, base_score + random.uniform(-1, 0.5)))
        
        # Tính điểm tổng chuẩn (trung bình cộng của 3 cái trên)
        final_human_score = round((kithuat + trinhbay + thucnghiem) / 3, 1)

        dataset.append({
            "report_text": report,
            "topic_requirements": topic,
            "human_score": final_human_score,
            "rubric_scores": {
                "Nội dung kỹ thuật": round(kithuat, 1),
                "Trình bày": round(trinhbay, 1),
                "Thực nghiệm": round(thucnghiem, 1)
            }
        })
        
    # Xáo trộn dataset
    random.shuffle(dataset)
    
    with open("eval_dataset.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    generate_super_realistic_dataset(500)
    print("Đã đẻ thành công 500 mẫu báo cáo sinh viên siêu thực tế vào eval_dataset.json")
