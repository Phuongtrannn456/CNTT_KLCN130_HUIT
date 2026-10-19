const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { web3Utils } = require('../config/web3');

const challenges = new Map();
const qrSessions = new Map();

const generateChallenge = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ ví không hợp lệ' });
    }

    const nonce = uuidv4().substring(0, 8);
    const timestamp = new Date().toISOString();
    const challenge = `Hệ thống Web3 K-12\n\nThời gian: ${timestamp}\nNonce: ${nonce}\nVí: ${walletAddress}\n\nVui lòng ký thông báo này để xác thực.`;
    const challengeId = uuidv4();

    challenges.set(challengeId, {
      challenge,
      walletAddress: walletAddress.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    res.json({ success: true, challenge, challengeId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const _loginUser = async (walletAddress) => {
  const lowerWallet = walletAddress.toLowerCase();
  let userRecord = await User.findOne({ walletAddress: lowerWallet });
  
  if (!userRecord) {
    const isAdmin = lowerWallet === '0xe5d499c6946b69a74d77b063be4492a12cdfd119';
    userRecord = new User({
      walletAddress: lowerWallet,
      role: isAdmin ? 'admin' : 'guest'
    });
    await userRecord.save();
  }

  // Convert role to role_id for frontend compatibility
  const roleMap = {
    'admin': 'ADMIN_ROLE',
    'teacher': 'TEACHER_ROLE',
    'student': 'STUDENT_ROLE',
    'guest': 'GUEST_ROLE'
  };
  const role_id = roleMap[userRecord.role] || 'GUEST_ROLE';

  const token = jwt.sign(
    { id: userRecord._id, role_id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  return { token, userRecord, role_id };
};

const verifySignature = async (req, res) => {
  try {
    const { challengeId, signature } = req.body;
    const challengeData = challenges.get(challengeId);
    
    if (!challengeData || challengeData.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Mã thử thách đã hết hạn' });
    }

    const { challenge, walletAddress } = challengeData;
    let isValidSignature = false;
    
    try {
      isValidSignature = web3Utils.verifySignature(challenge, signature, walletAddress);
    } catch (e) {
      isValidSignature = false;
    }

    if (!isValidSignature) {
      return res.status(401).json({ success: false, message: 'Chữ ký không hợp lệ.' });
    }

    challenges.delete(challengeId);

    const { token, userRecord, role_id } = await _loginUser(walletAddress);

    res.json({
      success: true,
      token,
      user: {
        id: userRecord._id,
        role_id,
        name: userRecord.fullName,
        walletAddress: userRecord.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Xác thực thất bại' });
  }
};

const verifyQrSignature = async (req, res) => {
  try {
    const { sessionId, walletAddress, signature } = req.body;
    if (!sessionId || !walletAddress || !signature) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số' });
    }

    const sessionData = qrSessions.get(sessionId);
    if (!sessionData || sessionData.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
    }

    let isValidSignature = false;
    try {
      isValidSignature = web3Utils.verifySignature(sessionData.challenge, signature, walletAddress);
    } catch (e) {
      isValidSignature = false;
    }

    if (!isValidSignature) {
      return res.status(401).json({ success: false, message: 'Chữ ký không hợp lệ.' });
    }

    qrSessions.delete(sessionId);

    const { token, userRecord, role_id } = await _loginUser(walletAddress);

    const io = req.app.get('io');
    if (io) {
      io.to(`qr:${sessionId}`).emit('qr:success', {
        token,
        user: {
          id: userRecord._id,
          role_id,
          name: userRecord.fullName,
          walletAddress: userRecord.walletAddress
        }
      });
    }

    res.json({ success: true, message: 'Đăng nhập QR thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Xác thực thất bại' });
  }
};

const logout = async (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công' });
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const roleMap = {
      'admin': 'ADMIN_ROLE',
      'teacher': 'TEACHER_ROLE',
      'student': 'STUDENT_ROLE',
      'guest': 'GUEST_ROLE'
    };

    res.json({ success: true, user: { ...user._doc, role_id: roleMap[user.role] } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { skills, department, gradeLevel, school } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    // Zero-PII: Khong cho phep nguoi dung nhap ten that hay email ca nhan
    // He thong giu nguyen fullName va email la DID Pseudonym duoc sinh tu dia chi vi
    if (skills && Array.isArray(skills)) user.skills = skills;
    if (department) user.department = department;
    if (gradeLevel) user.gradeLevel = gradeLevel;
    if (school) user.school = school;
    
    user.profileUpdated = true;
    await user.save();

    res.json({ success: true, message: 'Cập nhật hồ sơ thành công (Zero-PII bảo toàn)', user: { ...user._doc } });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật hồ sơ' });
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) return res.status(401).json({ success: false, message: 'Yêu cầu token truy cập' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', { clockTolerance: 300 }, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    req.user = user;
    next();
  });
};

const generateQrSession = async (req, res) => {
  try {
    const sessionId = uuidv4();
    const nonce = uuidv4().substring(0, 8);
    const timestamp = new Date().toISOString();
    const challenge = `Hệ thống Web3 K-12\nXác thực đăng nhập di động\nThời gian: ${timestamp}\nNonce: ${nonce}\n\nVui lòng ký thông báo này để hoàn tất đăng nhập.`;

    qrSessions.set(sessionId, {
      challenge,
      expiresAt: Date.now() + 10 * 60 * 1000,
      authenticated: false
    });

    res.json({ success: true, sessionId, challenge });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Tạo phiên QR thất bại' });
  }
};

// Removed registerWithRole since we don't need manual role requests anymore, guests are auto-created

module.exports = { 
  generateChallenge, 
  verifySignature, 
  logout, 
  getProfile, 
  updateProfile,
  authenticateToken,
  generateQrSession,
  verifyQrSignature
};
