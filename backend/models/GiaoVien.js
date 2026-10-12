const mongoose = require('mongoose');

const giaoVienSchema = new mongoose.Schema({
  MaGV: { type: String, required: true, unique: true },
  HoTen: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  ChuyenNganh: { type: String },
  WalletAddress: { type: String, required: true, unique: true },
  // === Mở rộng cho hệ thống K-12 (Giáo dục phổ thông) ===
  ToBoMon: { type: String, default: '' },
  ChuNhiemLop: { type: String, default: '' },
  CredentialId: { type: String, default: null },
  IsActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

giaoVienSchema.virtual('walletAddress').get(function() {
  return this.WalletAddress;
});

module.exports = mongoose.model('GiaoVien', giaoVienSchema);
