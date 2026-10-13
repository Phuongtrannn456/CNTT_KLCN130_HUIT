const mongoose = require('mongoose');

const hocSinhSchema = new mongoose.Schema({
  MaHS: { type: String, required: true, unique: true },
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
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Bidirectional virtuals (Getters & Setters)
hocSinhSchema.virtual('walletAddress')
  .get(function() { return this.WalletAddress; })
  .set(function(val) { this.WalletAddress = val; });

hocSinhSchema.virtual('fullName')
  .get(function() { return this.HoTen; })
  .set(function(val) { this.HoTen = val; });

hocSinhSchema.virtual('studentId')
  .get(function() { return this.MaHS; })
  .set(function(val) { this.MaHS = val; });

hocSinhSchema.virtual('gradeLevel')
  .get(function() { return this.KhoiLop || 10; })
  .set(function(val) { this.KhoiLop = val; });

hocSinhSchema.virtual('school')
  .get(function() { return this.TruongHoc || ''; })
  .set(function(val) { this.TruongHoc = val; });

hocSinhSchema.virtual('conduct')
  .get(function() { return this.HanhKiem || 'Tốt'; })
  .set(function(val) { this.HanhKiem = val; });

hocSinhSchema.virtual('gpa')
  .get(function() { return this.DiemTongKet || this.GPA || 0; })
  .set(function(val) { this.DiemTongKet = val; this.GPA = val; });

hocSinhSchema.virtual('skills')
  .get(function() { return this.KyNang || []; })
  .set(function(val) { this.KyNang = val; });

hocSinhSchema.virtual('profileUpdated')
  .get(function() { return this.DaCapNhatHoSo || false; })
  .set(function(val) { this.DaCapNhatHoSo = val; });

// Pre-validate hook để tự động đồng bộ khi nhận input English
hocSinhSchema.pre('validate', function() {
  if (!this.WalletAddress && this.walletAddress) this.WalletAddress = this.walletAddress;
  if (!this.HoTen && this.fullName) this.HoTen = this.fullName;
  if (!this.MaHS && this.studentId) this.MaHS = this.studentId;
  if (!this.KhoiLop && this.gradeLevel) this.KhoiLop = this.gradeLevel;
  if (!this.TruongHoc && this.school) this.TruongHoc = this.school;
  if (!this.HanhKiem && this.conduct) this.HanhKiem = this.conduct;
  if (!this.DiemTongKet && this.gpa) this.DiemTongKet = this.gpa;
  if (!this.KyNang && this.skills) this.KyNang = this.skills;
  if (this.WalletAddress) this.WalletAddress = this.WalletAddress.toLowerCase();
});

module.exports = mongoose.model('HocSinh', hocSinhSchema);
