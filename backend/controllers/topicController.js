const Topic = require("../models/Topic");
const Registration = require("../models/Registration");
const { asyncHandler } = require("../utils/asyncHandler");

const listTopics = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.teacherId) filter.teacherId = req.query.teacherId;
  const topics = await Topic.find(filter).sort({ createdAt: -1 });
  res.json(topics);
});

const createTopic = asyncHandler(async (req, res) => {
  const deadline = new Date(req.body.registrationDeadline);
  if (Number.isNaN(deadline.getTime())) {
    return res.status(400).json({ message: "Hạn đăng ký không hợp lệ" });
  }
  const topic = await Topic.create({ ...req.body, registrationDeadline: deadline });
  res.status(201).json(topic);
});

const updateTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!topic) return res.status(404).json({ message: "Không tìm thấy đề tài" });
  res.json(topic);
});

const updateTopicStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) {
    return res.status(400).json({ message: "Trạng thái đề tài không hợp lệ" });
  }
  const topic = await Topic.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!topic) return res.status(404).json({ message: "Không tìm thấy đề tài" });
  res.json(topic);
});

const deleteTopic = asyncHandler(async (req, res) => {
  const relatedCount = await Registration.countDocuments({ topicId: req.params.id });
  if (relatedCount > 0) {
    return res.status(409).json({
      message: "Đề tài đã có dữ liệu đăng ký. Hãy đóng đề tài thay vì xóa để bảo toàn dữ liệu."
    });
  }
  const topic = await Topic.findByIdAndDelete(req.params.id);
  if (!topic) return res.status(404).json({ message: "Không tìm thấy đề tài" });
  res.json({ message: "Đã xóa đề tài" });
});

module.exports = {
  listTopics,
  createTopic,
  updateTopic,
  updateTopicStatus,
  deleteTopic
};
