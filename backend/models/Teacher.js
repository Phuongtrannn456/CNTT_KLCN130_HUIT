const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, default: '' }, // Tổ bộ môn
  homeroomClass: { type: String, default: '' }, // Chủ nhiệm lớp
  walletAddress: { type: String, required: true, unique: true },
  credentialId: { type: String, default: null }, // ID của Teacher Credential trên Smart Contract
  isActive: { type: Boolean, default: true } // Trạng thái hoạt động
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

teacherSchema.virtual('WalletAddress').get(function() {
  return this.walletAddress;
});

module.exports = mongoose.model('Teacher', teacherSchema);
