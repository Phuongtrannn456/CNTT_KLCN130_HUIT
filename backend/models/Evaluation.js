const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  rubricScores: [{
    criteriaName: { type: String },
    maxScore: { type: Number },
    aiScore: { type: Number },
    aiFeedback: { type: String },
    teacherScore: { type: Number },
    teacherFeedback: { type: String }
  }],
  
  aiTotalScore: { type: Number },
  teacherTotalScore: { type: Number },
  
  aiFeedback: { type: String },
  teacherFeedback: { type: String },
  
  status: { type: String, enum: ['DRAFT', 'FINAL'], default: 'DRAFT' }
}, { timestamps: true });

// Mỗi Submission chỉ có 1 Evaluation
evaluationSchema.index({ submission: 1 }, { unique: true });

module.exports = mongoose.model('Evaluation', evaluationSchema);
