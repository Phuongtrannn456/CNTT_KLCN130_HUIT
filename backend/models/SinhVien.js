const mongoose = require('mongoose');

const sinhVienSchema = new mongoose.Schema({
  MaSV: { type: String, required: true, unique: true },
  HoTen: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  GPA: { type: Number, default: 0 },
  ChuyenNganh: { type: String, default: '' },
  KyNang: [{ type: String }],
  BangDiemKyNang: [{
    TenKyNang: { type: String, required: true },
    Diem: { type: Number, required: true, default: 8.0 }
  }],
  WalletAddress: { type: String, required: true, unique: true },
  DaCapNhatHoSo: { type: Boolean, default: false },
  
  // === Mở rộng cho hệ thống K-12 (Giáo dục phổ thông) ===
  KhoiLop: { type: Number, min: 1, max: 12 },
  TruongHoc: { type: String, default: '' },
  HanhKiem: { type: String, enum: ['Tốt', 'Khá', 'Trung bình', 'Yếu'], default: 'Tốt' },
  DiemTongKet: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SinhVien', sinhVienSchema);
