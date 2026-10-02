const Topic = require("../models/Topic");
const Report = require("../models/Report");
const { uploadToIPFS, gatewayUrl } = require("../services/ipfsService");
const { recordSubmission, verifySubmission } = require("../services/blockchainService");
const { asyncHandler } = require("../utils/asyncHandler");

const listReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.topicId) filter.topicId = req.query.topicId;
  const reports = await Report.find(filter).populate("topicId").sort({ submittedAt: -1 });
  res.json(reports.map(r => ({ ...r.toObject(), gatewayUrl: gatewayUrl(r.ipfsCid) })));
});

const submitReport = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Vui lòng chọn tệp báo cáo" });
  const { topicId, studentId } = req.body;
  if (!topicId || !studentId) {
    return res.status(400).json({ message: "Thiếu topicId hoặc studentId" });
  }
  const topic = await Topic.findById(topicId);
  if (!topic) return res.status(404).json({ message: "Không tìm thấy đề tài" });

  const report = await Report.create({
    topicId,
    studentId,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    submittedAt: new Date(),
    web3Status: "PROCESSING"
  });

  try {
    const ipfs = await uploadToIPFS(req.file.buffer, req.file.originalname);
    report.ipfsCid = ipfs.cid;
    report.fileHash = ipfs.fileHash;
    report.ipfsProvider = ipfs.provider;
    await report.save();
  } catch (error) {
    report.web3Status = "IPFS_FAILED";
    await report.save();
    return res.status(502).json({ message: `Lưu IPFS thất bại: ${error.message}`, report });
  }

  try {
    const chain = await recordSubmission({
      reportId: report._id.toString(),
      cid: report.ipfsCid,
      fileHash: report.fileHash,
      submittedAt: report.submittedAt
    });
    report.transactionHash = chain.transactionHash;
    report.blockchainProvider = chain.provider;
    report.web3Status = "VERIFIED";
    await report.save();
  } catch (error) {
    report.web3Status = "BLOCKCHAIN_FAILED";
    await report.save();
    return res.status(502).json({ message: `Ghi Blockchain thất bại: ${error.message}`, report });
  }

  res.status(201).json({ ...report.toObject(), gatewayUrl: gatewayUrl(report.ipfsCid) });
});

const verifyReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).populate("topicId");
  if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo" });
  if (!report.ipfsCid || !report.fileHash || !report.transactionHash) {
    return res.status(409).json({ message: "Báo cáo chưa đủ dữ liệu Web3 để kiểm chứng" });
  }

  const result = await verifySubmission({
    reportId: report._id.toString(),
    cid: report.ipfsCid,
    fileHash: report.fileHash,
    submittedAt: report.submittedAt,
    transactionHash: report.transactionHash
  });

  res.json({
    valid: result.valid,
    provider: result.provider,
    report: {
      id: report._id,
      topic: report.topicId?.title,
      studentId: report.studentId,
      originalName: report.originalName,
      ipfsCid: report.ipfsCid,
      fileHash: report.fileHash,
      transactionHash: report.transactionHash,
      submittedAt: report.submittedAt,
      gatewayUrl: gatewayUrl(report.ipfsCid)
    },
    onChain: result.onChain
  });
});

module.exports = {
  listReports,
  submitReport,
  verifyReport
};
