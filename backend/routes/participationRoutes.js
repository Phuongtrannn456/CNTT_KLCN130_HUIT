const express = require('express');
const router = express.Router();
const participationController = require('../controllers/participationController');
const { authenticateToken } = require('../controllers/authController');

router.get('/me', authenticateToken, participationController.getMyParticipations);

const submissionController = require('../controllers/submissionController');
router.post('/:participationId/submissions', authenticateToken, submissionController.submitWork);
router.get('/:participationId/submissions', authenticateToken, submissionController.getSubmissionsByParticipation);

module.exports = router;
