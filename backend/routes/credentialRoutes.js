const express = require('express');
const router = express.Router();
const credentialController = require('../controllers/credentialController');
const { authenticateToken } = require('../controllers/authController');
const { requireRole } = require('../middleware/authz');

// Get my credentials
router.get('/me', authenticateToken, credentialController.getMyCredentials);

// Claim flow (Student signs)
router.get('/claim-message/:achievementId', authenticateToken, requireRole('STUDENT_ROLE'), credentialController.generateClaimMessage);
router.post('/claim', authenticateToken, requireRole('STUDENT_ROLE'), credentialController.claimCredential);

// Public verification
router.get('/:credentialId/verify', credentialController.verifyCredential);

router.post('/:credentialId/revoke', authenticateToken, requireRole('TEACHER_ROLE'), credentialController.revokeCredential);
module.exports = router;
