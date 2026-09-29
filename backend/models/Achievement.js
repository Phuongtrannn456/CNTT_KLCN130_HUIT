const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  learningResult: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningResult', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  achievementType: { type: String, required: true }, // VD: "Challenge Completed"
  issuedAt: { type: Date, default: Date.now }
  
  // Các trường Web3 sẽ được mở rộng ở Phase 5
  // credentialId: { type: String },
  // blockchainTx: { type: String }
}, { timestamps: true });

// Tránh duplicate achievement cùng loại cho một học sinh trong 1 challenge
achievementSchema.index({ student: 1, challenge: 1, achievementType: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
