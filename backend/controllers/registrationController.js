const Registration = require("../models/Registration");
const Topic = require("../models/Topic");
const { asyncHandler } = require("../utils/asyncHandler");

async function approvedCount(topicId) {
  return Registration.countDocuments({ topicId, status: "APPROVED" });
}

const listRegistrations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.topicId) filter.topicId = req.query.topicId;
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.status) filter.status = req.query.status;
  const rows = await Registration.find(filter)
    .populate("topicId")
    .sort({ createdAt: -1 });
  res.json(rows);
});

const createRegistration = asyncHandler(async (req, res) => {
  const { topicId, studentId } = req.body;
  if (!topicId || !studentId) {
    return res.status(400).json({ message: "Thiếu topicId hoặc studentId" });
  }
  const topic = await Topic.findById(topicId);
  if (!topic) return res.status(404).json({ message: "Không tìm thấy đề tài" });
  if (topic.status !== "PUBLISHED") {
    return res.status(400).json({ message: "Đề tài chưa mở đăng ký" });
  }
  if (new Date() > new Date(topic.registrationDeadline)) {
    return res.status(400).json({ message: "Đã hết hạn đăng ký" });
  }
  if (await approvedCount(topicId) >= topic.maxStudents) {
    return res.status(400).json({ message: "Đề tài đã đủ số lượng học sinh" });
  }
  const existed = await Registration.findOne({ topicId, studentId });
  if (existed) {
    return res.status(409).json({ message: "Học sinh đã đăng ký đề tài này" });
  }
  const row = await Registration.create({ topicId, studentId });
  res.status(201).json(row);
});

const reviewRegistration = asyncHandler(async (req, res) => {
  const { status, note = "", reviewedBy = "GV001" } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "Trạng thái duyệt không hợp lệ" });
  }
  const row = await Registration.findById(req.params.id);
  if (!row) return res.status(404).json({ message: "Không tìm thấy đăng ký" });

  if (status === "APPROVED") {
    const topic = await Topic.findById(row.topicId);
    if (!topic) return res.status(404).json({ message: "Không tìm thấy đề tài" });
    if (await approvedCount(topic._id) >= topic.maxStudents && row.status !== "APPROVED") {
      return res.status(400).json({ message: "Đề tài đã đủ số lượng học sinh" });
    }
  }

  row.status = status;
  row.note = note;
  row.reviewedBy = reviewedBy;
  row.reviewedAt = new Date();
  await row.save();
  await row.populate("topicId");
  res.json(row);
});

module.exports = {
  listRegistrations,
  createRegistration,
  reviewRegistration
};
