const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gradeLevel: { type: Number, min: 1, max: 12 }, // Khối lớp
  school: { type: String, default: '' },
  conduct: { type: String, enum: ['Tốt', 'Khá', 'Trung bình', 'Yếu'], default: 'Tốt' }, // Hạnh kiểm
  gpa: { type: Number, default: 0 }, // Điểm tổng kết
  skills: [{ type: String }],
  walletAddress: { type: String, required: true, unique: true },
  profileUpdated: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
