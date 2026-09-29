const Challenge = require('../models/Challenge');
const Student = require('../models/Student');
const ChallengeParticipation = require('../models/ChallengeParticipation');

exports.joinChallenge = async (req, res) => {
  try {
    const studentId = req.user.id;
    const challengeId = req.params.id;

    // 1. Validate roles
    if (req.user.role_id !== 'STUDENT_ROLE') {
      return res.status(403).json({ success: false, message: 'Chỉ Student mới được tham gia Challenge' });
    }

    // 2. Lấy Challenge
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Challenge' });
    }

    if (challenge.status === 'Closed' || challenge.status === 'Completed') {
      return res.status(403).json({ success: false, message: 'Challenge đã đóng hoặc hoàn thành' });
    }

    // Check deadline
    const now = new Date();
    const effectiveDeadline = challenge.registrationDeadline || challenge.deadline;
    if (effectiveDeadline && now > new Date(effectiveDeadline)) {
      return res.status(403).json({ success: false, message: 'Challenge đã quá hạn đăng ký' });
    }

    // 3. Lấy Student và check eligibility
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin Student' });
    }

    if (challenge.eligibleGrades && challenge.eligibleGrades.length > 0) {
      if (!student.gradeLevel || !challenge.eligibleGrades.includes(student.gradeLevel)) {
        return res.status(403).json({ 
          success: false, 
          message: `Khối lớp ${student.gradeLevel || 'N/A'} không phù hợp với yêu cầu của Challenge (Khối ${challenge.eligibleGrades.join(', ')})` 
        });
      }
    }

    // 4. Tạo Participation
    const participation = new ChallengeParticipation({
      student: student._id,
      challenge: challenge._id,
      status: 'JOINED'
    });

    await participation.save();

    res.status(201).json({ success: true, message: 'Đăng ký tham gia thành công', participation });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bạn đã tham gia Challenge này rồi' });
    }
    console.error('Lỗi khi join challenge:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi join challenge' });
  }
};

exports.getChallengeParticipants = async (req, res) => {
  try {
    const challengeId = req.params.id;
    const teacherId = req.user.id;

    // Check challenge ownership
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Challenge' });
    }
    
    if (challenge.createdBy.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem danh sách tham gia của Challenge này' });
    }

    const participants = await ChallengeParticipation.find({ challenge: challengeId })
      .populate('student', 'fullName email gradeLevel studentId walletAddress');

    res.status(200).json({ success: true, participants });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách participants:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getMyParticipations = async (req, res) => {
  try {
    const studentId = req.user.id;
    const participations = await ChallengeParticipation.find({ student: studentId })
      .populate('challenge', 'title subject deadline challengeType status');

    res.status(200).json({ success: true, participations });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tham gia:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
