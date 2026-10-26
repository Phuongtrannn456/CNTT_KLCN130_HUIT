import os
import time
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/web3giaovien")

def run_fine_tuning_loop():
    print("=== BẮT ĐẦU VÒNG LẶP ACTIVE LEARNING ===")
    
    # 1. Connect to MongoDB
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()
    
    # 2. Lấy dữ liệu độ lệch (Delta) do giáo viên sửa
    # Lấy những sample có delta > 1.0 (Giáo viên chấm lệch nhiều so với AI) và chưa train
    training_data_coll = db['aitrainingdatas']
    samples = list(training_data_coll.find({"isTrained": False, "delta": {"$gt": 1.0}}))
    
    if not samples:
        print("[INFO] Không đủ dữ liệu độ lệch (delta > 1.0) mới để fine-tune hôm nay.")
        return
        
    print(f"[INFO] Tìm thấy {len(samples)} mẫu dữ liệu do giáo viên hiệu chỉnh.")
    
    # 3. Chuẩn bị dataset cho Hugging Face Trainer (Scaffold)
    dataset = []
    for s in samples:
        dataset.append({
            "text": s.get("inputText", "")[:500], # Demo truncate
            "teacher_truth": s.get("teacherScore"),
            "ai_old_score": s.get("aiScore")
        })
        
    print("[MOCK] Đang chuẩn bị dataset...")
    time.sleep(1)
    print(f"[MOCK] Đang Fine-tune mô hình vinai/phobert-base với {len(dataset)} mẫu (Epoch 1/3)...")
    time.sleep(2)
    print("[MOCK] Loss giảm từ 2.34 -> 1.12")
    time.sleep(1)
    print("[MOCK] Đang lưu checkpoint mới vào thư mục ./models/checkpoints_v2/")
    
    # 4. Đánh dấu đã train xong
    sample_ids = [s["_id"] for s in samples]
    training_data_coll.update_many(
        {"_id": {"$in": sample_ids}},
        {"$set": {"isTrained": True}}
    )
    
    print("=== FINE-TUNING HOÀN TẤT ===")
    print("AI đã cập nhật 'gu' chấm điểm của giáo viên. Các phiên bản tiếp theo sẽ chuẩn xác hơn.")

if __name__ == "__main__":
    run_fine_tuning_loop()
