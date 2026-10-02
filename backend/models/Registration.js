const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
  studentId: { type: String, required: true, trim: true, index: true },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING",
    index: true
  },
  note: { type: String, default: "", trim: true },
  reviewedBy: { type: String, default: "", trim: true },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

registrationSchema.index({ topicId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
