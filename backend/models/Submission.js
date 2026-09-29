const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  participation: { type: mongoose.Schema.Types.ObjectId, ref: 'ChallengeParticipation', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  
  content: { type: String, default: '' },
  attachments: [{
    fileName: String,
    fileUrl: String, // Có thể là IPFS CID hoặc URL
    fileType: String
  }],
  
  version: { type: Number, default: 1 },
  isLate: { type: Boolean, default: false },
  
  status: { type: String, enum: ['Submitted', 'Evaluated'], default: 'Submitted' }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
