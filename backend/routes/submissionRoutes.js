const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticateToken } = require('../controllers/authController');
const { requireRole } = require('../middleware/authz');

// Ai cũng phải đăng nhập
router.use(authenticateToken);

// Teacher chấm điểm
router.post('/:submissionId/evaluate', requireRole('TEACHER_ROLE'), evaluationController.evaluateSubmission);

// Xem điểm (Student/Teacher)
router.get('/:submissionId/evaluation', evaluationController.getEvaluation);

module.exports = router;
