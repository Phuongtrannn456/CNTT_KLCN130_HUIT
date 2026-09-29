const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiK12Controller');
const { authenticateToken } = require('../controllers/authController');
const { requireRole } = require('../middleware/authz');

// Student get recommended challenges
router.get('/recommended-challenges', authenticateToken, requireRole('STUDENT_ROLE'), aiController.getRecommendedChallenges);

// Both Student and Teacher can analyze a submission (ownership checked in controller)
router.post('/submissions/:submissionId/analyze', authenticateToken, aiController.analyzeSubmission);

// Only Teacher can request suggested evaluation
router.post('/submissions/:submissionId/evaluate-suggest', authenticateToken, requireRole('TEACHER_ROLE'), aiController.suggestEvaluation);

module.exports = router;
