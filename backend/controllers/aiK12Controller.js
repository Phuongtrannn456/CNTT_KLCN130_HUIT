const Challenge = require('../models/Challenge');
const Student = require('../models/Student');
const Submission = require('../models/Submission');
const matchingService = require('../services/matchingService');
const aiService = require('../services/aiService');
const logger = require('../config/logger');

// 4.1 AI Matching
exports.getRecommendedChallenges = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Filter cơ bản bằng DB
    const openChallenges = await Challenge.find({ 
      status: 'Open',
      eligibleGrades: student.gradeLevel 
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
      const result = await matchingService.matchStudentToTopics(student, topicsPayload);
      
      // Map ngược lại
      const recommendations = result.recommendations.map(rec => {
        const chal = openChallenges.find(c => c._id.toString() === rec.topicId);
        return {
          challenge: chal,
          matchScore: rec.matchScore,
          reasoning: `AI đánh giá mức độ phù hợp: ${Math.round(rec.matchScore * 100)}% dựa trên kỹ năng của bạn.`
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

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

    // Authorization
    if (req.user.role_id === 'STUDENT_ROLE' && submission.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role_id === 'TEACHER_ROLE' && submission.challenge.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const result = await aiService.analyzeReport(submission.content, [submission.challenge.description]);
      
      return res.status(200).json({
        success: true,
        aiAvailable: true,
        analysis: {
          strengths: result.feedback?.strengths || 'N/A',
          weaknesses: result.feedback?.weaknesses || 'N/A',
          issues: result.issues || [],
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

    // Authorization: Chỉ Teacher sở hữu Challenge mới được gợi ý chấm
    if (req.user.role_id !== 'TEACHER_ROLE' || submission.challenge.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const rubrics = submission.challenge.rubrics;
    if (!rubrics || rubrics.length === 0) {
      return res.status(400).json({ success: false, message: 'Challenge does not have rubrics' });
    }

    // Map rubrics to FastAPI format
    const mappedRubrics = rubrics.map(r => ({
      criteria: r.criteriaName,
      description: r.description,
      weight: r.weight,
      max_score: r.maxScore
    }));

    try {
      const result = await aiService.analyzeWithRubrics(submission.content, mappedRubrics);
      
      // Validate Output
      let aiTotalScore = parseFloat(result.score) || 0;
      let rubricScores = [];

      if (result.details && Array.isArray(result.details)) {
        rubricScores = result.details.map((d, index) => {
          let score = parseFloat(d.score) || 0;
          const max = mappedRubrics[index]?.max_score || 10;
          if (score < 0) score = 0;
          if (score > max) score = max;
          
          return {
            criteriaName: mappedRubrics[index].criteria,
            aiScore: score,
            aiFeedback: d.feedback || 'Không có nhận xét'
          };
        });
      } else {
        const chunkScore = aiTotalScore / rubrics.length;
        rubricScores = rubrics.map(r => ({
          criteriaName: r.criteriaName,
          aiScore: Math.min(chunkScore, r.maxScore),
          aiFeedback: 'Dựa trên phân tích tổng thể.'
        }));
      }

      const maxTotal = rubrics.reduce((sum, r) => sum + r.maxScore, 0);
      if (aiTotalScore < 0) aiTotalScore = 0;
      if (aiTotalScore > maxTotal) aiTotalScore = maxTotal;

      return res.status(200).json({
        success: true,
        aiAvailable: true,
        suggestion: {
          aiTotalScore,
          aiFeedback: result.feedback || 'Bài làm đạt yêu cầu, cần cải thiện thêm chi tiết.',
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
