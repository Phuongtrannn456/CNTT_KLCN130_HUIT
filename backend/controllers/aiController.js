const aiService = require('../services/aiService');
const matchingService = require('../services/matchingService');
const logger = require('../config/logger');

exports.analyzeReport = async (req, res) => {
    try {
        const { text, topicRequirements } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: "No text provided for analysis" });
        }

        logger.info(`[AI] Report analysis requested | textLength=${text.length}`);
        const result = await aiService.analyzeReport(text, topicRequirements, req.ip);
        logger.info(`[AI] Report analysis completed | score=${result.score}`);
        res.json(result);
    } catch (err) {
        logger.error(`[AI] Report analysis failed: ${err.message}`);
        if (err.message && err.message.includes('timeout')) {
            return res.status(504).json({ error: "AI server timeout" });
        }
        res.status(500).json({ error: err.message || "Error analyzing report via AI" });
    }
};

exports.analyzeReportWithRubrics = async (req, res) => {
    try {
        const { text, rubrics } = req.body;
        if (!text || !rubrics || !rubrics.length) {
            return res.status(400).json({ error: "Cần text và rubrics để phân tích" });
        }
        logger.info(`[AI] Rubrics analysis requested | criteria=${rubrics.length} | textLength=${text.length}`);
        const result = await aiService.analyzeWithRubrics(text, rubrics, req.ip);
        logger.info(`[AI] Rubrics analysis completed | criteria=${rubrics.length} | score=${result.score}`);
        res.json(result);
    } catch (err) {
        logger.error(`[AI] Rubrics analysis failed: ${err.message}`);
        if (err.message && err.message.includes('timeout')) {
            return res.status(504).json({ error: "AI server timeout" });
        }
        res.status(500).json({ error: err.message || "Error analyzing report with Rubrics" });
    }
};

exports.matchStudent = async (req, res) => {
    try {
        const { studentProfile, topics } = req.body;
        
        if (!studentProfile || !topics || !Array.isArray(topics)) {
            return res.status(400).json({ error: "Invalid student profile or topics data" });
        }

        const result = await matchingService.matchStudentToTopics(studentProfile, topics, req.ip);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message || "Error matching student via AI" });
    }
};

