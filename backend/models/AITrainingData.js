const mongoose = require('mongoose');

const aiTrainingDataSchema = new mongoose.Schema({
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    
    // Inputs to the model
    inputText: { type: String, required: true },
    topicRequirements: { type: [String], default: [] },
    
    // Outputs
    aiScore: { type: Number, required: true },
    teacherScore: { type: Number, required: true },
    
    // Delta (độ lệch)
    delta: { type: Number, required: true },
    
    // Trạng thái huấn luyện
    isTrained: { type: Boolean, default: false },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AITrainingData', aiTrainingDataSchema);
