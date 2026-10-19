const mongoose = require('mongoose');

const ketQuaTestSchema = new mongoose.Schema({
  BaiTest: { type: mongoose.Schema.Types.ObjectId, ref: 'BaiTest', required: true },
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  HocSinh: { type: mongoose.Schema.Types.ObjectId, ref: 'HocSinh', required: true },
  DangKyDeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DangKyDeTai' },
  Nhom: { type: mongoose.Schema.Types.ObjectId, ref: 'Nhom' },
  TraLoi: [{
    CauHoiIndex: { type: Number, required: true },
    LoaiCauHoi: { type: String, enum: ['TracNghiem', 'Code'] },
    TraLoiText: { type: String, default: '' },       // Đáp án HS chọn hoặc code viết
    Diem: { type: Number, default: 0 },              // Điểm đạt được
    DiemToiDa: { type: Number, default: 1 },
    DungSai: { type: Boolean },                      // Đúng/Sai (trắc nghiệm)
    AI_Similarity: { type: Number }                  // SBERT similarity score (code)
  }],
  TongDiem: { type: Number, default: 0 },
  DiemToiDa: { type: Number, default: 0 },
  TxHash: { type: String },                          // Blockchain transaction
  ThoiGianBatDau: { type: Date },
  ThoiGianNop: { type: Date },

  // === GIÁM SÁT THI CỬ & CHỐNG GIAN LẬN AI ===
  SoLanChuyenTab: { type: Number, default: 0 },
  SoLanThoatFullscreen: { type: Number, default: 0 },
  LichSuViPham: [{
    LoaiViPham: { type: String, default: 'Chung' },
    ThoiDiem: { type: Date, default: Date.now },
    ChiTiet: { type: String, default: '' }
  }],
  AI_CheatScore: { type: Number, default: 0 },       // 0 - 100%
  AI_CheatAssessment: { 
    type: String, 
    enum: ['Liêm chính', 'Nghi vấn nhẹ', 'Vi phạm quy chế'], 
    default: 'Liêm chính' 
  },
  BiHuyKetQua: { type: Boolean, default: false },
  LyDoHuy: { type: String, default: '' }
}, { timestamps: true });

// Một HS chỉ nộp 1 lần cho 1 bài test
ketQuaTestSchema.index({ BaiTest: 1, HocSinh: 1 }, { unique: true });

module.exports = mongoose.model('KetQuaTest', ketQuaTestSchema);
