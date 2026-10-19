const mongoose = require('mongoose');

const roleRequestSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, lowercase: true },
  hoTen: { type: String, default: '' },
  email: { type: String, default: '' },
  chuyenNganh: { type: String, default: 'Tổ STEM & Tin Học' },
  requestedRole: { type: String, default: 'TEACHER_ROLE' },
  schoolToken: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: { type: Date, default: null },
  rejectReason: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('RoleRequest', roleRequestSchema);
