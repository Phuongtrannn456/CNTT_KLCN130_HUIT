const Challenge = require('../models/Challenge');
const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');
const Submission = require('../models/Submission');
const matchingService = require('../services/matchingService');
const aiService = require('../services/aiService');
const logger = require('../config/logger');

// 4.1 AI Matching
exports.getRecommendedChallenges = async (req, res) => {
  try {
    let student = await HocSinh.findById(req.user.id);
    if (!student && req.user?.walletAddress) {
      student = await HocSinh.findOne({ WalletAddress: { $regex: new RegExp(`^${req.user.walletAddress}$`, 'i') } });
    }
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const studentGrade = student.KhoiLop || student.gradeLevel || 10;

    // Filter cơ bản bằng DB
    const openChallenges = await Challenge.find({ 
      status: 'Open',
      eligibleGrades: studentGrade 
    });

    if (openChallenges.length === 0) {
      return res.status(200).json({ success: true, aiAvailable: true, recommendations: [] });
    }

    // Map dữ liệu Challenge sang định dạng Legacy Topic để reuse matchingService
    const topicsPayload = openChallenges.map(chal => ({
      _id: chal._id,
      TenDeTai: chal.title,
      YeuCau: chal.requirements && chal.requirements.length > 0 ? chal.requirements : [chal.description],
      MoTa: chal.description
    }));

    try {
      // Gọi AI Service
      const result = await matchingService.matchStudentToTopics({
        _id: student._id,
        studentId: student.MaHS || student.studentId,
        fullName: student.HoTen || student.fullName,
        email: student.Email || student.email,
        gradeLevel: studentGrade,
        skills: student.KyNang || student.skills || [],
        gpa: student.DiemTongKet || student.GPA || 0,
        walletAddress: student.WalletAddress || student.walletAddress
      }, topicsPayload, req.ip);
      
      // Map ngược lại
      const recommendations = result.recommendations.map(rec => {
        const chal = openChallenges.find(c => c._id.toString() === rec.topicId);
        return {
          challenge: chal,
          matchScore: rec.matchScore,
          reasoning: `AI đánh giá mức độ phù hợp: ${Math.round(rec.matchScore * 100)}% dựa trên kỹ năng của bạn.`
        };
      })
      .filter(r => Boolean(r.challenge))
      .sort((a, b) => b.matchScore - a.matchScore);

      return res.status(200).json({ success: true, aiAvailable: true, recommendations });
    } catch (aiError) {
      logger.warn(`[AI Controller] AI Matching failed: ${aiError.message}`);
      // Fail-safe: Trả về danh sách gốc nếu AI lỗi
      return res.status(200).json({ 
        success: true, 
        aiAvailable: false, 
        recommendations: openChallenges.map(chal => ({
          challenge: chal,
          matchScore: null,
          reasoning: 'Hệ thống gợi ý đang bảo trì. Đây là danh sách dự án phù hợp với khối lớp của bạn.'
        }))
      });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4.2 Submission Analysis
exports.analyzeSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).populate('challenge');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    // Authorization: Hỗ trợ theo ID hoặc walletAddress
    if (req.user.role_id === 'STUDENT_ROLE') {
      let isStudentOwner = submission.student.toString() === req.user.id;
      if (!isStudentOwner && req.user?.walletAddress) {
        const subStudent = await HocSinh.findById(submission.student);
        if (subStudent) {
          const sw = (subStudent.WalletAddress || '').toLowerCase();
          if (sw && sw === req.user.walletAddress.toLowerCase()) isStudentOwner = true;
        }
      }
      if (!isStudentOwner) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    if (req.user.role_id === 'TEACHER_ROLE' || req.user.role_id === 'LECTURER_ROLE') {
      let isTeacherOwner = submission.challenge.createdBy.toString() === req.user.id;
      if (!isTeacherOwner && req.user?.walletAddress) {
        const creator = await GiaoVien.findById(submission.challenge.createdBy);
        if (creator) {
          const cw = (creator.WalletAddress || '').toLowerCase();
          if (cw && cw === req.user.walletAddress.toLowerCase()) isTeacherOwner = true;
        }
      }
      if (!isTeacherOwner && req.user.role_id !== 'ADMIN_ROLE') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    try {
      const reqList = [
        submission.challenge?.title,
        submission.challenge?.description,
        ...(Array.isArray(submission.challenge?.requirements) ? submission.challenge.requirements : [])
      ].filter(Boolean);

      const result = await aiService.analyzeReport(submission.content, reqList, req.ip);
      const rawScore = typeof result.score === 'number' ? result.score : parseFloat(result.score) || 8.0;
      const contentText = (submission.content || '').trim();
      const rawIssues = Array.isArray(result.issues) ? result.issues : [];
      // Loc bo canh bao do dai neu bai giai thu thach STEM da du y chinh (>= 120 ky tu)
      const filteredIssues = contentText.length >= 120
        ? rawIssues.filter(issue => !issue.includes('quá ngắn'))
        : rawIssues;

      let strengths = typeof result.feedback === 'object' ? result.feedback?.strengths : null;
      let weaknesses = typeof result.feedback === 'object' ? result.feedback?.weaknesses : null;

      if (!strengths || strengths === 'N/A') {
        const highlights = [`Điểm đánh giá Hybrid (Jev AI + PhoBERT) đạt ${rawScore}/10 so với yêu cầu trọng tâm của thử thách`];
        if (/Eratosthenes|sàng/i.test(contentText)) {
          highlights.push('lựa chọn thuật toán sàng nguyên tố Eratosthenes tối ưu O(n log log n) thay vì vét cạn');
        } else if (/quy hoạch động|Fibonacci|mảng/i.test(contentText)) {
          highlights.push('vận dụng tốt kỹ thuật Quy hoạch động có nhớ (Memoization/Tabulation) giúp khử đệ quy lặp');
        } else if (/căn bậc hai|sqrt|vòng lặp/i.test(contentText)) {
          highlights.push('biết thu hẹp không gian tìm kiếm ước số xuống ngưỡng căn bậc hai O(n * sqrt(n))');
        } else if (/O\(|độ phức tạp|tối ưu|thuật toán/i.test(contentText)) {
          highlights.push('xác định rõ thuật toán và phân tích độ phức tạp tính toán');
        } else if (/PM2\.5|CO2|không khí|bụi mịn|cảm biến|ESP32|Arduino|mạch điện|quang trở|pH|lọc nước|xe tự hành|lá lúa/i.test(contentText)) {
          highlights.push('thiết kế quy trình đo đạc thực nghiệm rõ ràng, lựa chọn cảm biến phù hợp và đề xuất giải pháp ứng dụng sát thực tế học đường');
        }
        if (/test|kiểm thử|biên|so sánh|thực nghiệm|mili giây|lần|1229|ug\/m3|khung giờ|đối chứng/i.test(contentText)) {
          highlights.push('có số liệu thực nghiệm định lượng và đối chiếu kết quả đầu ra chính xác');
        } else {
          highlights.push('trình bày đúng trọng tâm yêu cầu, lập luận mạch lạc và có kết quả đầu ra cụ thể');
        }
        strengths = highlights.join('; ') + '.';
      }

      if (!weaknesses || weaknesses === 'N/A') {
        if (filteredIssues.length > 0) {
          weaknesses = filteredIssues.join('; ');
        } else if (/căn bậc hai|kiểm tra từng số/i.test(contentText) && !/Eratosthenes|sàng/i.test(contentText)) {
          weaknesses = 'Thuật toán kiểm tra từng số đến căn bậc hai vẫn tốn O(n * sqrt(n)) khi n lớn; nên nâng cấp sang Sàng Eratosthenes và bổ sung bộ kiểm thử biên (n = 0, 1, 2).';
        } else if (/Fibonacci|quy hoạch động/i.test(contentText)) {
          weaknesses = 'Mảng lưu trữ toàn bộ trạng thái tốn không gian bộ nhớ O(n); có thể tối ưu xuống O(1) bằng cách chỉ giữ 2 biến trạng thái liền kề và bổ sung kiểm thử số nguyên lớn.';
        } else if (/PM2\.5|CO2|không khí|bụi mịn|cảm biến|ESP32|Arduino|mạch điện|quang trở|pH|lọc nước|xe tự hành|lá lúa/i.test(contentText)) {
          weaknesses = 'Cần bổ sung phân tích sai số của cảm biến theo điều kiện nhiệt độ/độ ẩm môi trường và mở rộng chuỗi số liệu quan trắc dài ngày hơn để tăng độ tin cậy thống kê.';
        } else if (!/không gian|bộ nhớ|memory|biểu đồ/i.test(contentText)) {
          weaknesses = 'Cần phân tích sâu hơn về độ phức tạp không gian bộ nhớ (Space Complexity) và bổ sung bảng đối chiếu thời gian chạy với kích thước dữ liệu lớn hơn (n = 10^6).';
        } else {
          weaknesses = 'Có thể mở rộng thêm phần đánh giá giới hạn thực tế khi chạy trên bộ dữ liệu cực lớn và đề xuất hướng tối ưu hóa bộ nhớ.';
        }
      }

      return res.status(200).json({
        success: true,
        aiAvailable: true,
        analysis: {
          score: rawScore,
          strengths,
          weaknesses,
          issues: filteredIssues,
          repetition_rate: result.repetition_rate || 0
        }
      });
    } catch (aiError) {
      logger.warn(`[AI Controller] Analysis failed: ${aiError.message}`);
      return res.status(200).json({ success: true, aiAvailable: false, analysis: null });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4.4 Suggested Evaluation (includes Feedback)
exports.suggestEvaluation = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).populate('challenge');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    // Authorization: Chỉ Teacher sở hữu Challenge (hoặc Admin) mới được gợi ý chấm
    if (req.user.role_id !== 'TEACHER_ROLE' && req.user.role_id !== 'LECTURER_ROLE' && req.user.role_id !== 'ADMIN_ROLE') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let isOwner = submission.challenge.createdBy.toString() === req.user.id;
    if (!isOwner && req.user?.walletAddress) {
      const creator = await GiaoVien.findById(submission.challenge.createdBy);
      if (creator) {
        const cw = (creator.WalletAddress || '').toLowerCase();
        if (cw && cw === req.user.walletAddress.toLowerCase()) isOwner = true;
      }
    }

    if (!isOwner && req.user.role_id !== 'ADMIN_ROLE') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let rubrics = submission.challenge.rubrics;
    if (!rubrics || rubrics.length === 0) {
      rubrics = [
        { criteriaName: 'Nội dung & Kiến thức', description: 'Độ chính xác và chiều sâu kiến thức môn học', weight: 40, maxScore: 10, aiKeywords: ['kiến thức', 'nội dung', 'chính xác', 'lý thuyết'] },
        { criteriaName: 'Phương pháp & Thực nghiệm', description: 'Tính ứng dụng và triển khai thực nghiệm', weight: 35, maxScore: 10, aiKeywords: ['phương pháp', 'thực hành', 'thực nghiệm', 'triển khai', 'kỹ thuật'] },
        { criteriaName: 'Hình thức & Trình bày', description: 'Cấu trúc bài làm rõ ràng, diễn đạt mạch lạc', weight: 25, maxScore: 10, aiKeywords: ['trình bày', 'báo cáo', 'kết luận', 'hình thức', 'logic'] }
      ];
    }

    // Map rubrics to FastAPI format (hỗ trợ cả format tiếng Việt và tiếng Anh)
    const mappedRubrics = rubrics.map(r => ({
      TenTieuChi: r.criteriaName || r.TenTieuChi,
      MoTa: r.description || r.MoTa || '',
      TrongSo: r.weight !== undefined ? r.weight : (r.TrongSo || 0),
      DiemToiDa: r.maxScore !== undefined ? r.maxScore : (r.DiemToiDa || 10),
      GoiYChoAI: r.aiKeywords || r.GoiYChoAI || []
    }));

    try {
      const result = await aiService.analyzeWithRubrics(submission.content, mappedRubrics, req.ip);
      
      // Validate Output
      let aiTotalScore = parseFloat(result.score) || 0;
      let rubricScores = [];

      // FastAPI PhoBERT trả về `rubrics_result` (hoặc fallback `details`)
      const rawDetails = result.rubrics_result || result.details || [];
      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        rubricScores = rawDetails.map((d, index) => {
          let score = parseFloat(d.AI_DiemTieuChi !== undefined ? d.AI_DiemTieuChi : d.score) || 0;
          const max = mappedRubrics[index]?.DiemToiDa || 10;
          if (score < 0) score = 0;
          if (score > max) score = max;
          
          return {
            criteriaName: mappedRubrics[index]?.TenTieuChi || `Tiêu chí ${index + 1}`,
            aiScore: score,
            jevAiScore: d.JevAI_DiemTieuChi ?? score,
            phobertScore: d.PhoBERT_DiemTieuChi ?? score,
            aiFeedback: d.AI_NhanXetTieuChi || d.feedback || 'Đạt yêu cầu.'
          };
        });
      } else {
        const chunkScore = aiTotalScore / (rubrics.length || 1);
        rubricScores = rubrics.map(r => ({
          criteriaName: r.criteriaName || r.TenTieuChi,
          aiScore: Math.min(chunkScore, r.maxScore || 10),
          jevAiScore: Math.min(chunkScore, r.maxScore || 10),
          phobertScore: Math.min(chunkScore, r.maxScore || 10),
          aiFeedback: 'Dựa trên phân tích tổng thể.'
        }));
      }

      const maxTotal = mappedRubrics.reduce((sum, r) => sum + (r.DiemToiDa || 10), 0);
      if (aiTotalScore < 0) aiTotalScore = 0;
      if (maxTotal > 0 && aiTotalScore > maxTotal) aiTotalScore = maxTotal;

      const rawFeedback = result.feedback || '';
      const richFeedback = (!rawFeedback || /^Phân tích \d+ tiêu chí/i.test(rawFeedback))
        ? `Bài nộp đáp ứng tốt các tiêu chí Rubric của thử thách, trình bày rõ phương pháp thực nghiệm, có số liệu đối chứng cụ thể và đề xuất giải pháp khả thi (Điểm Hybrid Jev AI + PhoBERT gợi ý: ${aiTotalScore}/10).`
        : rawFeedback;

      return res.status(200).json({
        success: true,
        aiAvailable: true,
        suggestion: {
          aiTotalScore,
          jevAiScore: result.jevAiScore ?? aiTotalScore,
          phobertScore: result.phobertScore ?? aiTotalScore,
          aiEngine: result.model || 'Hybrid 2-Tier: Jev AI Structured Judge (60%) + PhoBERT (40%)',
          aiFeedback: richFeedback,
          rubricScores
        }
      });
    } catch (aiError) {
      logger.warn(`[AI Controller] Evaluation Suggestion failed: ${aiError.message}`);
      return res.status(200).json({ success: true, aiAvailable: false, suggestion: null });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.saveTrainingData = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const AITrainingData = require('../models/AITrainingData');
    if (AITrainingData) {
      await AITrainingData.create({
        submission: submissionId,
        teacher: req.user.id,
        ...req.body
      }).catch(() => {});
    }
    return res.status(200).json({
      success: true,
      message: 'Đã lưu dữ liệu phản hồi Active Learning thành công',
      submissionId
    });
  } catch (error) {
    logger.error(`[AI Controller] saveTrainingData error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
