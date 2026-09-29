const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, default: '' }, // Tổ bộ môn
  homeroomClass: { type: String, default: '' }, // Chủ nhiệm lớp
  walletAddress: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
