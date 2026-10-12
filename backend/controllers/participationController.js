const Challenge = require('../models/Challenge');
const Student = require('../models/Student');
const HocSinh = require('../models/HocSinh');
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

    // 3. Lấy Student và check eligibility (fallback sang HocSinh nếu chưa có bên Student)
    let student = await Student.findById(studentId);
    if (!student) {
      const hs = await HocSinh.findById(studentId);
      if (hs) {
        student = await Student.findOneAndUpdate(
          { walletAddress: hs.WalletAddress.toLowerCase() },
          {
            $setOnInsert: { _id: hs._id },
            studentId: hs.MaHS,
            fullName: hs.HoTen,
            email: hs.Email,
            gradeLevel: hs.KhoiLop || 10,
            school: hs.TruongHoc || '',
            conduct: hs.HanhKiem || 'Tốt',
            gpa: hs.DiemTongKet || hs.GPA || 0,
            skills: hs.KyNang || [],
            walletAddress: hs.WalletAddress.toLowerCase(),
            profileUpdated: hs.DaCapNhatHoSo || false
          },
          { upsert: true, new: true }
        );
      }
    }

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

    // Check challenge ownership (hỗ trợ dual model GiaoVien & Teacher)
    let isOwner = challenge.createdBy.toString() === teacherId;
    if (!isOwner) {
      const Teacher = require('../models/Teacher');
      const GiaoVien = require('../models/GiaoVien');
      const teacher = (await Teacher.findById(teacherId)) || (await GiaoVien.findById(teacherId));
      const creator = (await Teacher.findById(challenge.createdBy)) || (await GiaoVien.findById(challenge.createdBy));
      if (teacher && creator) {
        const w1 = (teacher.walletAddress || teacher.WalletAddress || '').toLowerCase();
        const w2 = (creator.walletAddress || creator.WalletAddress || '').toLowerCase();
        if (w1 && w1 === w2) isOwner = true;
      }
    }

    if (!isOwner && req.user.role_id !== 'ADMIN_ROLE') {
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
    const studentIds = [studentId];
    const hs = await HocSinh.findById(studentId);
    if (hs && hs.WalletAddress) {
      const s = await Student.findOne({ walletAddress: hs.WalletAddress.toLowerCase() });
      if (s && !studentIds.some(id => id.toString() === s._id.toString())) {
        studentIds.push(s._id);
      }
    }
    const sObj = await Student.findById(studentId);
    if (sObj && sObj.walletAddress) {
      const h = await HocSinh.findOne({ WalletAddress: sObj.walletAddress.toLowerCase() });
      if (h && !studentIds.some(id => id.toString() === h._id.toString())) {
        studentIds.push(h._id);
      }
    }

    const participations = await ChallengeParticipation.find({ student: { $in: studentIds } })
      .populate('challenge', 'title subject deadline challengeType status');

    res.status(200).json({ success: true, participations });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tham gia:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
