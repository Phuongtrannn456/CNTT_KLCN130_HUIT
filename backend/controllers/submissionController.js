const Submission = require('../models/Submission');
const ChallengeParticipation = require('../models/ChallengeParticipation');
const Challenge = require('../models/Challenge');

exports.submitWork = async (req, res) => {
  try {
    const { participationId } = req.params;
    const studentId = req.user.id;
    const { content, attachments } = req.body;

    // 1. Kiểm tra tham gia
    const participation = await ChallengeParticipation.findById(participationId).populate('challenge');
    if (!participation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tham gia' });
    }

    if (participation.student.toString() !== studentId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền nộp bài cho người khác' });
    }

    // 2. Kiểm tra deadline
    const challenge = participation.challenge;
    let isLate = false;
    if (challenge.deadline && new Date() > new Date(challenge.deadline)) {
      isLate = true;
      // Có thể thêm rule chặn luôn nếu cần:
      // return res.status(403).json({ success: false, message: 'Đã quá hạn nộp bài' });
    }

    // 3. Tính toán version
    const existingSubmissionsCount = await Submission.countDocuments({ participation: participationId });
    const version = existingSubmissionsCount + 1;

    // 4. Lưu submission
    const submission = new Submission({
      participation: participationId,
      student: studentId,
      challenge: challenge._id,
      content,
      attachments,
      version,
      isLate,
      status: 'Submitted'
    });

    await submission.save();

    res.status(201).json({ success: true, message: 'Nộp bài thành công', submission });
  } catch (error) {
    console.error('Lỗi khi nộp bài:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getSubmissionsByParticipation = async (req, res) => {
  try {
    const { participationId } = req.params;
    const userId = req.user.id;
    const role = req.user.role_id;

    const participation = await ChallengeParticipation.findById(participationId).populate('challenge');
    if (!participation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tham gia' });
    }

    // Authorization
    if (role === 'STUDENT_ROLE' && participation.student.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Không được xem bài của học sinh khác' });
    }

    if (role === 'TEACHER_ROLE' && participation.challenge.createdBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Chỉ giáo viên tạo Challenge mới được xem' });
    }

    const submissions = await Submission.find({ participation: participationId }).sort({ version: -1 });

    res.status(200).json({ success: true, submissions });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bài nộp:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
