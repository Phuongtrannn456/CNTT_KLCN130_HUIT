const mongoose = require('mongoose');

const dangKyDeTaiSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  // --- Nhóm mới (Phase 2) ---
  Nhom: { type: mongoose.Schema.Types.ObjectId, ref: 'Nhom' },
  TruongNhom: { type: mongoose.Schema.Types.ObjectId, ref: 'HocSinh' },
  // --- Backward compat (cũ) ---
  HocSinh: { type: mongoose.Schema.Types.ObjectId, ref: 'HocSinh' },
  ThanhVien: [{
    HocSinh: { type: mongoose.Schema.Types.ObjectId, ref: 'HocSinh' },
    VaiTro: { type: String, enum: ['TruongNhom', 'ThanhVien'], default: 'ThanhVien' },
    TrangThaiTV: {
      type: String,
      enum: ['DaMoi', 'DaChapNhan', 'TuChoi'],
      default: 'DaChapNhan'
    },
    NgayThamGia: { type: Date, default: Date.now }
  }],
  TrangThai: { 
    type: String, 
    enum: ['ChoDuyet', 'ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi', 'DaDuyet', 'TuChoi', 'Thua'], 
    default: 'ChoDuyet' 
  },
  ThoiGianSubmit: { type: Date },  // Ghi ngay khi nhận submit (Phase 3)
}, { timestamps: true });

// Một nhóm chỉ đăng ký 1 đề tài 1 lần
dangKyDeTaiSchema.index({ DeTai: 1, Nhom: 1 }, { unique: true, sparse: true });
// Backward compat: HocSinh index
dangKyDeTaiSchema.index({ DeTai: 1, HocSinh: 1 }, { unique: true, sparse: true });
// Index cho query getAll: lọc trạng thái active rồi nhóm theo đề tài
dangKyDeTaiSchema.index({ TrangThai: 1, DeTai: 1 });

module.exports = mongoose.model('DangKyDeTai', dangKyDeTaiSchema);
