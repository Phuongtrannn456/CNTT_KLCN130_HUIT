const Submission = require('../models/Submission');
const ChallengeParticipation = require('../models/ChallengeParticipation');
const Challenge = require('../models/Challenge');
const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');

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

    let isStudentOwner = participation.student.toString() === studentId;
    if (!isStudentOwner && req.user?.walletAddress) {
      const subStudent = await HocSinh.findById(participation.student);
      if (subStudent) {
        const sw = (subStudent.WalletAddress || '').toLowerCase();
        if (sw && sw === req.user.walletAddress.toLowerCase()) isStudentOwner = true;
      }
    }

    if (!isStudentOwner) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền nộp bài cho người khác' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung bài nộp' });
    }

    // 2. Kiểm tra trạng thái Challenge
    const challenge = participation.challenge;
    if (challenge.status === 'Closed' || challenge.status === 'Completed') {
      return res.status(403).json({ success: false, message: 'Challenge đã đóng hoặc hoàn thành, không thể nộp bài' });
    }

    // Chặn nộp bài nếu đã được chốt điểm FINAL
    const Evaluation = require('../models/Evaluation');
    const existingSubIds = await Submission.find({ participation: participationId }).distinct('_id');
    const existingFinalEval = await Evaluation.findOne({ submission: { $in: existingSubIds }, status: 'FINAL' });
    if (existingFinalEval) {
      return res.status(403).json({ success: false, message: 'Bài tập này đã được giáo viên chốt điểm (FINAL), không thể nộp thêm phiên bản mới.' });
    }

    let isLate = false;
    if (challenge.deadline && new Date() > new Date(challenge.deadline)) {
      isLate = true;
    }

    // --- MỚI: Chống bấm trùng ---
    const recentSub = await Submission.findOne({ participation: participationId }).sort({ createdAt: -1 });
    if (recentSub) {
      const timeDiff = new Date() - recentSub.createdAt;
      // Dưới 5 giây và cùng nội dung
      if (timeDiff < 5000 && recentSub.content === content && JSON.stringify(recentSub.attachments) === JSON.stringify(attachments)) {
        return res.status(201).json({ success: true, message: 'Nộp bài thành công', submission: recentSub });
      }
    }

    // 3. Tính toán version (có retry)
    let submission;
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      try {
        const existingSubmissionsCount = await Submission.countDocuments({ participation: participationId });
        const version = existingSubmissionsCount + 1;

        submission = new Submission({
          participation: participationId,
          student: participation.student || studentId,
          challenge: challenge._id,
          content,
          attachments,
          version,
          isLate,
          status: 'Submitted'
        });

        await submission.save();
        break; // Thành công
      } catch (err) {
        if (err.code === 11000) {
          attempts++;
          if (attempts >= maxAttempts) {
            return res.status(409).json({ success: false, message: 'Hệ thống đang bận, vui lòng nộp lại.' });
          }
          await new Promise(r => setTimeout(r, Math.random() * 100 + attempts * 50));
        } else {
          throw err;
        }
      }
    }

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
    if (role === 'STUDENT_ROLE') {
      let isStudentOwner = participation.student.toString() === userId;
      if (!isStudentOwner && req.user?.walletAddress) {
        const subStudent = await HocSinh.findById(participation.student);
        if (subStudent) {
          const sw = (subStudent.WalletAddress || '').toLowerCase();
          if (sw && sw === req.user.walletAddress.toLowerCase()) isStudentOwner = true;
        }
      }
      if (!isStudentOwner) {
        return res.status(403).json({ success: false, message: 'Không được xem bài của học sinh khác' });
      }
    }

    if (role === 'TEACHER_ROLE' || role === 'LECTURER_ROLE') {
      let isTeacherOwner = participation.challenge.createdBy.toString() === userId;
      if (!isTeacherOwner && req.user?.walletAddress) {
        const creator = await GiaoVien.findById(participation.challenge.createdBy);
        if (creator) {
          const cw = (creator.WalletAddress || '').toLowerCase();
          if (cw && cw === req.user.walletAddress.toLowerCase()) isTeacherOwner = true;
        }
      }
      if (!isTeacherOwner && req.user?.role_id !== 'ADMIN_ROLE') {
        return res.status(403).json({ success: false, message: 'Chỉ giáo viên tạo Challenge mới được xem' });
      }
    }

    const submissions = await Submission.find({ participation: participationId }).sort({ version: -1 });

    res.status(200).json({ success: true, submissions });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bài nộp:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
