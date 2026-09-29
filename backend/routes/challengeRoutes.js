const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const participationController = require('../controllers/participationController');
const { authenticateToken } = require('../controllers/authController');
const { requireRole } = require('../middleware/authz');

// Middleware xác thực K-12
const requireTeacher = [authenticateToken, requireRole('TEACHER_ROLE')];
const requireAuth = [authenticateToken]; // Dùng chung cho ai cũng được

router.get('/', requireAuth, challengeController.getChallenges);
router.get('/:id', requireAuth, challengeController.getChallengeById);
router.post('/', requireTeacher, challengeController.createChallenge);
router.put('/:id', requireTeacher, challengeController.updateChallenge);
router.delete('/:id', requireTeacher, challengeController.deleteChallenge);

router.post('/:id/join', requireAuth, participationController.joinChallenge);
router.get('/:id/participants', requireTeacher, participationController.getChallengeParticipants);

module.exports = router;
