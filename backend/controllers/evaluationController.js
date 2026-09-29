const Evaluation = require('../models/Evaluation');
const Submission = require('../models/Submission');
const ChallengeParticipation = require('../models/ChallengeParticipation');
const LearningResult = require('../models/LearningResult'); // Cần cho Step 4

exports.evaluateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const teacherId = req.user.id;
    const { rubricScores, teacherTotalScore, teacherFeedback, status } = req.body; // status: DRAFT / FINAL

    // 1. Kiểm tra Submission
    const submission = await Submission.findById(submissionId).populate({
      path: 'participation',
      populate: { path: 'challenge' }
    });
    
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nộp' });
    }

    const challenge = submission.participation.challenge;

    // 2. Authorization
    if (challenge.createdBy.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: 'Chỉ giáo viên tạo Challenge mới được chấm bài' });
    }

    // 3. Xử lý lưu Evaluation
    let evaluation = await Evaluation.findOne({ submission: submissionId });
    if (evaluation && evaluation.status === 'FINAL') {
      return res.status(403).json({ success: false, message: 'Bài này đã chốt điểm (FINAL), không thể sửa' });
    }

    if (!evaluation) {
      evaluation = new Evaluation({
        submission: submissionId,
        evaluator: teacherId,
        rubricScores,
        teacherTotalScore,
        teacherFeedback,
        status: status || 'DRAFT'
      });
    } else {
      evaluation.rubricScores = rubricScores !== undefined ? rubricScores : evaluation.rubricScores;
      evaluation.teacherTotalScore = teacherTotalScore !== undefined ? teacherTotalScore : evaluation.teacherTotalScore;
      evaluation.teacherFeedback = teacherFeedback !== undefined ? teacherFeedback : evaluation.teacherFeedback;
      evaluation.status = status || evaluation.status;
    }

    await evaluation.save();

    // 4. Nếu FINAL, tạo LearningResult (STEP 4 trigger)
    if (evaluation.status === 'FINAL') {
      // Đơn giản hóa: tính Final Grade
      let finalGrade = 'Đạt';
      if (evaluation.teacherTotalScore >= 8) finalGrade = 'Xuất sắc';
      else if (evaluation.teacherTotalScore < 5) finalGrade = 'Không đạt';

      // Tránh duplicate
      let lr = await LearningResult.findOne({ student: submission.student, challenge: challenge._id });
      if (!lr) {
        lr = new LearningResult({
          student: submission.student,
          challenge: challenge._id,
          evaluation: evaluation._id,
          finalGrade
        });
        await lr.save();
      // Step 4.2: T?o Achievement off-chain (ti?n d? cho Web3 credential)
      const Achievement = require('../models/Achievement');
      let ach = await Achievement.findOne({ student: submission.student, challenge: challenge._id, achievementType: 'Challenge Completed' });
      if (!ach) {
        ach = new Achievement({
          learningResult: lr._id,
          student: submission.student,
          challenge: challenge._id,
          issuer: teacherId,
          achievementType: 'Challenge Completed'
        });
        await ach.save();
      }
      }
    }

    res.status(200).json({ success: true, message: 'Đã lưu điểm', evaluation });
  } catch (error) {
    console.error('Lỗi khi chấm bài:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getEvaluation = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const role = req.user.role_id;

    const submission = await Submission.findById(submissionId).populate({
      path: 'participation',
      populate: { path: 'challenge' }
    });

    if (!submission) return res.status(404).json({ success: false, message: 'Không tìm thấy bài nộp' });

    // Auth
    const isOwnerStudent = submission.student.toString() === userId && role === 'STUDENT_ROLE';
    const isOwnerTeacher = submission.participation.challenge.createdBy.toString() === userId && role === 'TEACHER_ROLE';

    if (!isOwnerStudent && !isOwnerTeacher) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem đánh giá này' });
    }

    const evaluation = await Evaluation.findOne({ submission: submissionId });
    if (!evaluation) return res.status(404).json({ success: false, message: 'Chưa có đánh giá' });

    // Student chỉ được xem nếu FINAL (Tùy business rule, tạm cho xem nếu đã có)
    if (role === 'STUDENT_ROLE' && evaluation.status !== 'FINAL') {
      return res.status(403).json({ success: false, message: 'Đánh giá chưa hoàn tất (DRAFT), chưa thể xem' });
    }

    res.status(200).json({ success: true, evaluation });
  } catch (error) {
    console.error('Lỗi khi lấy đánh giá:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
