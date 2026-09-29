const mongoose = require('mongoose');

const challengeParticipationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  status: { type: String, enum: ['JOINED', 'DROPPED', 'COMPLETED'], default: 'JOINED' },
  joinedAt: { type: Date, default: Date.now },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' } // Phục vụ Phase sau nếu có Team
}, { timestamps: true });

// Mỗi Student chỉ được Join một Challenge 1 lần
challengeParticipationSchema.index({ student: 1, challenge: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeParticipation', challengeParticipationSchema);
