const mongoose = require('mongoose');

const giangVienSchema = new mongoose.Schema({
  MaGV: { type: String, required: true, unique: true },
  HoTen: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  ChuyenNganh: { type: String },
  WalletAddress: { type: String, required: true, unique: true },
  // === Mở rộng cho hệ thống K-12 (Giáo dục phổ thông) ===
  ToBoMon: { type: String, default: '' },
  ChuNhiemLop: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('GiangVien', giangVienSchema);
