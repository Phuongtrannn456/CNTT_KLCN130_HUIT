const logger = require('../config/logger');

// MÔ PHỎNG SBERT MATCHING (Sentence-BERT) trực tiếp trên Node.js
// Lý do: Không cần chạy service Python nặng nề khi test UI.
exports.matchStudentToTopics = async (studentProfile, topics) => {
    try {
        logger.info(`[AI] Mocking SBERT Matching | topics=${topics.length}`);

        const majorScores = {};
        const kyNang = studentProfile.skills || studentProfile.ky_nang || studentProfile.KyNang || [];
        kyNang.forEach(skill => { majorScores[skill.toLowerCase()] = 8.0; });
        const gpa = studentProfile.gpa || studentProfile.GPA || 3.0;

        const finalRecommendations = topics.map(t => {
            let reqs = [];
            if (t.YeuCau && Array.isArray(t.YeuCau) && t.YeuCau.length > 0) {
                reqs = t.YeuCau.map(r => r.toLowerCase());
            }
            
            // Tính điểm mô phỏng: match số lượng kỹ năng
            let matchedSkills = 0;
            for (let req of reqs) {
                for (let skill of Object.keys(majorScores)) {
                    if (req.includes(skill) || skill.includes(req)) {
                        matchedSkills++;
                    }
                }
            }

            // Công thức (giống SBERT test script): 60% semantic + 40% GPA
            // Điểm Semantic max 1.0 (Giả lập: mỗi skill match được 0.3 điểm semantic)
            let semanticScore = Math.min(1.0, matchedSkills * 0.35);
            if (reqs.length === 0) semanticScore = 0.1;
            
            // Nếu là đề tài ReactJS và HS có skill ReactJS/Web thì ưu tiên cao
            if (t.TenDeTai && t.TenDeTai.toLowerCase().includes('reactjs') && (majorScores['reactjs'] || majorScores['lập trình web'])) {
                semanticScore = 0.95;
            }

            let gpaScore = Math.min(1.0, gpa / 10.0);
            
            let finalScore = (semanticScore * 0.6) + (gpaScore * 0.4);

            return {
                topicId: t._id.toString(),
                title: t.TenDeTai,
                matchScore: finalScore
            };
        });

        return {
            status: "success",
            recommendations: finalRecommendations
        };

    } catch (error) {
        logger.error(`[AI] Mock Matching service error: ${error.message}`);
        throw error;
    }
};
