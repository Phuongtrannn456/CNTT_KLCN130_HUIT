const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'role_model'
  },
  wallet_address: {
    type: String,
    required: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['TEACHER_ROLE', 'LECTURER_ROLE', 'STUDENT_ROLE', 'ADMIN_ROLE'],
    required: true
  },
  role_model: {
    type: String,
    required: true,
    enum: ['GiaoVien', 'HocSinh', 'Admin']
  },
  qr_hash: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Chú ý: Đảm bảo wallet_address luôn lưu dạng lowercase để dễ so sánh
qrCodeSchema.pre('save', function() {
  if (this.wallet_address) {
    this.wallet_address = this.wallet_address.toLowerCase();
  }
});

module.exports = mongoose.model('QrCode', qrCodeSchema);
