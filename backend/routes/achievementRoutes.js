const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { authenticateToken } = require('../controllers/authController');
const { requireRole } = require('../middleware/authz');

router.get('/me', authenticateToken, requireRole('STUDENT_ROLE'), async (req, res) => {
  try {
    const achievements = await Achievement.find({ student: req.user.id })
      .populate('challenge', 'title subject')
      .populate('issuer', 'fullName')
      .sort({ issuedAt: -1 });
    res.status(200).json({ success: true, achievements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
