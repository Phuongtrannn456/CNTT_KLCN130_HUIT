require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const logger = require('../config/logger');

// Chạy dry run mặc định. Để thực sự ghi, chạy: node backfill_detai_winner.js --commit
const isDryRun = !process.argv.includes('--commit');

async function backfill() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('Thiếu MONGODB_URI');
        await mongoose.connect(uri);
        console.log(`Kết nối DB thành công. Dry run: ${isDryRun}`);

        // Tìm các đề tài DaChot nhưng chưa có DangKyThang
        const missingWinners = await DeTai.find({
            TrangThai: 'DaChot',
            $or: [
                { DangKyThang: { $exists: false } },
                { DangKyThang: null }
            ]
        });

        console.log(`Tìm thấy ${missingWinners.length} đề tài DaChot nhưng thiếu DangKyThang.`);

        let countSuccess = 0;
        let countFailed = 0;

        for (const deTai of missingWinners) {
            // Tìm đăng ký đã duyệt của đề tài này
            const approved = await DangKyDeTai.find({ DeTai: deTai._id, TrangThai: 'DaDuyet' });
            
            if (approved.length === 1) {
                const dangKy = approved[0];
                if (!isDryRun) {
                    await DeTai.findByIdAndUpdate(deTai._id, {
                        DangKyThang: dangKy._id,
                        NhomThang: dangKy.Nhom
                    });
                }
                console.log(`[SUCCESS] Đề tài ${deTai._id}: Backfill DangKyThang=${dangKy._id}, NhomThang=${dangKy.Nhom}`);
                countSuccess++;
            } else if (approved.length > 1) {
                console.log(`[ERROR] Đề tài ${deTai._id}: Có nhiều hơn 1 đăng ký DaDuyet (${approved.length}). Không thể tự động chọn.`);
                countFailed++;
            } else {
                console.log(`[ERROR] Đề tài ${deTai._id}: Không tìm thấy đăng ký nào ở trạng thái DaDuyet.`);
                countFailed++;
            }
        }

        console.log(`\nHoàn thành! Thành công: ${countSuccess}, Không xác định: ${countFailed}`);
        if (isDryRun) {
            console.log("CHÚ Ý: Đây là bản chạy khô (dry-run). DB chưa bị thay đổi. Chạy với tham số --commit để ghi.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Lỗi:", err);
        process.exit(1);
    }
}

backfill();
