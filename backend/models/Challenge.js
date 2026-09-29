const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  detailedDescription: { type: String, default: '' },
  requirements: [{ type: String }],
  eligibleGrades: [{ type: Number, min: 1, max: 12 }], // Khối lớp được phép tham gia
  
  // === RUBRICS CHẤM ĐIỂM ===
  rubrics: [{
    criteriaName: { type: String, required: true },
    description: { type: String, default: '' },
    weight: { type: Number, required: true, min: 0, max: 100 }, // % trọng số
    maxScore: { type: Number, default: 10 },
    aiKeywords: [{ type: String }] // Từ khóa cho AI matching
  }],
  useRubrics: { type: Boolean, default: false },
  
  maxTeamSize: { type: Number, default: 1, min: 1 },
  deadline: { type: Date, required: true },
  registrationDeadline: { type: Date },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  subject: { type: String }, // Môn học (VD: Toán, STEM, Tin học)
  
  status: { type: String, enum: ['Open', 'Closed', 'Completed'], default: 'Open' },
  challengeType: { type: String, enum: ['Project', 'STEM', 'Competition'], default: 'Project' }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
