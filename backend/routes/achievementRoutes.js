const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { authenticateToken } = require('../controllers/authController');
const { requireRole } = require('../middleware/authz');

router.get('/me', authenticateToken, requireRole('STUDENT_ROLE'), async (req, res) => {
  try {
    let studentIds = [req.user.id];
    if (req.user.walletAddress) {
      const HocSinh = require('../models/HocSinh');
      const lowerWallet = req.user.walletAddress.toLowerCase();
      const hs = await HocSinh.findOne({ WalletAddress: lowerWallet });
      if (hs && !studentIds.some(id => String(id) === String(hs._id))) studentIds.push(hs._id);
    }

    const achievements = await Achievement.find({ student: { $in: studentIds } })
      .populate('challenge', 'title subject')
      .populate('issuer', 'HoTen fullName')
      .sort({ issuedAt: -1 });
    res.status(200).json({ success: true, achievements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
