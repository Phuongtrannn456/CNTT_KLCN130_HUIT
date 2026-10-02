const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3 },
  description: { type: String, required: true, trim: true },
  requirements: { type: String, default: "", trim: true },
  maxStudents: { type: Number, required: true, min: 1, max: 20 },
  registrationDeadline: { type: Date, required: true },
  status: {
    type: String,
    enum: ["DRAFT", "PUBLISHED", "CLOSED"],
    default: "DRAFT",
    index: true
  },
  teacherId: { type: String, required: true, trim: true, index: true }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Topic", topicSchema);
