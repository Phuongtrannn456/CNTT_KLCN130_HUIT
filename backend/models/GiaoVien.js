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

// Bidirectional virtuals (Getters & Setters)
giaoVienSchema.virtual('walletAddress')
  .get(function() { return this.WalletAddress; })
  .set(function(val) { this.WalletAddress = val; });

giaoVienSchema.virtual('fullName')
  .get(function() { return this.HoTen; })
  .set(function(val) { this.HoTen = val; });

giaoVienSchema.virtual('teacherId')
  .get(function() { return this.MaGV; })
  .set(function(val) { this.MaGV = val; });

giaoVienSchema.virtual('department')
  .get(function() { return this.ToBoMon || this.ChuyenNganh || ''; })
  .set(function(val) { this.ToBoMon = val; this.ChuyenNganh = val; });

giaoVienSchema.virtual('homeroomClass')
  .get(function() { return this.ChuNhiemLop || ''; })
  .set(function(val) { this.ChuNhiemLop = val; });

giaoVienSchema.virtual('credentialId')
  .get(function() { return this.CredentialId || null; })
  .set(function(val) { this.CredentialId = val; });

giaoVienSchema.virtual('isActive')
  .get(function() { return this.IsActive !== false; })
  .set(function(val) { this.IsActive = val; });

// Pre-validate hook để tự động đồng bộ khi nhận input English
giaoVienSchema.pre('validate', function() {
  if (!this.WalletAddress && this.walletAddress) this.WalletAddress = this.walletAddress;
  if (!this.HoTen && this.fullName) this.HoTen = this.fullName;
  if (!this.MaGV && this.teacherId) this.MaGV = this.teacherId;
  if (!this.ToBoMon && this.department) this.ToBoMon = this.department;
  if (!this.ChuNhiemLop && this.homeroomClass) this.ChuNhiemLop = this.homeroomClass;
  if (!this.CredentialId && this.credentialId) this.CredentialId = this.credentialId;
  if (this.WalletAddress) this.WalletAddress = this.WalletAddress.toLowerCase();
});

module.exports = mongoose.model('GiaoVien', giaoVienSchema);
