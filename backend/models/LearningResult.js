const mongoose = require('mongoose');

const learningResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', required: true },
  
  finalGrade: { type: String, required: true }, // VD: 'Xuất sắc', 'Đạt', 'Không đạt'
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Mỗi Student - Challenge chỉ có 1 Learning Result
learningResultSchema.index({ student: 1, challenge: 1 }, { unique: true });

module.exports = mongoose.model('LearningResult', learningResultSchema);
