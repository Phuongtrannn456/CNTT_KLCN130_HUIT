const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
  studentId: { type: String, required: true, trim: true, index: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  ipfsCid: { type: String, default: "", index: true },
  fileHash: { type: String, default: "" },
  transactionHash: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now },
  web3Status: {
    type: String,
    enum: ["PROCESSING", "VERIFIED", "IPFS_FAILED", "BLOCKCHAIN_FAILED"],
    default: "PROCESSING",
    index: true
  },
  ipfsProvider: { type: String, default: "" },
  blockchainProvider: { type: String, default: "" }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Report", reportSchema);
