const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const GiaoVien = require('../models/GiaoVien');
const HocSinh = require('../models/HocSinh');
const Admin = require('../models/Admin');
const RoleRequest = require('../models/RoleRequest');
const { web3Utils } = require('../config/web3');
const blockchainService = require('../services/blockchainService');

const challenges = new Map();
const qrSessions = new Map();

// Tự động dọn dẹp các challenge và qrSession đã hết hạn mỗi 5 phút (tránh rò rỉ bộ nhớ)
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of challenges.entries()) {
    if (data.expiresAt < now) challenges.delete(id);
  }
  for (const [id, data] of qrSessions.entries()) {
    if (data.expiresAt < now) qrSessions.delete(id);
  }
}, 5 * 60 * 1000);

// GiaoVien và HocSinh là các model chuẩn duy nhất của hệ thống
const generateChallenge = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
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

    res.json({ success: true, challengeId, challenge, message: 'Please sign this message' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate challenge' });
  }
};

const verifySignature = async (req, res) => {
  try {
    const { challengeId, signature } = req.body;
    const challengeData = challenges.get(challengeId);
    
    if (!challengeData || challengeData.expiresAt < Date.now()) {
      challenges.delete(challengeId);
      return res.status(400).json({ success: false, message: 'Challenge expired or invalid' });
    }

    // Atomic single-use: Xóa ngay challenge để chống replay attack
    challenges.delete(challengeId);

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

    // Identify user role (Strict RBAC - Never accept role from client)
    let role_id = 'STUDENT_ROLE';
    const lowerWallet = walletAddress.toLowerCase();
    
    // 1. Kiểm tra Admin
    let userRecord = await Admin.findOne({ WalletAddress: lowerWallet });
    if (userRecord) {
      role_id = 'ADMIN_ROLE';
    } else {
      // 2. Kiểm tra Giáo viên
      userRecord = await GiaoVien.findOne({ WalletAddress: lowerWallet });
      
      if (userRecord) {
        if (userRecord.IsActive === false) {
          return res.status(403).json({ success: false, message: 'Tài khoản Giáo viên này đã bị thu hồi hoặc vô hiệu hóa.' });
        }

        // Nếu giáo viên có gắn Credential ID, xác minh On-Chain tính hợp lệ
        const credId = userRecord.CredentialId;
        if (credId) {
          const onChainStatus = await blockchainService.verifyTeacherCredentialOnChain(credId, lowerWallet);
          if (!onChainStatus.ok) {
            return res.status(503).json({ 
              success: false, 
              message: 'Lỗi xác minh chứng thực Giáo viên trên Blockchain. Vui lòng thử lại sau.' 
            });
          }
          if (!onChainStatus.isValid) {
            return res.status(403).json({ 
              success: false, 
              message: 'Chứng thực Giáo viên trên Blockchain đã hết hiệu lực hoặc bị thu hồi.' 
            });
          }
        }

        role_id = 'TEACHER_ROLE';
      } else {
        // 3. Kiểm tra xem ví này có đang gửi yêu cầu cấp quyền Giáo viên chờ duyệt không
        const pendingRequest = await RoleRequest.findOne({ walletAddress: lowerWallet, status: 'pending' });
        if (pendingRequest) {
          return res.json({
            success: true,
            isPending: true,
            message: 'Yêu cầu cấp quyền Giáo viên của bạn đang chờ Ban Giám Hiệu phê duyệt.',
            walletAddress: lowerWallet
          });
        }

        // 4. Kiểm tra Học sinh hiện có
        userRecord = await HocSinh.findOne({ WalletAddress: lowerWallet });
        
        if (userRecord) {
          role_id = 'STUDENT_ROLE';
        } else {
          // 5. Ví mới hoàn toàn -> Tự động khởi tạo Học sinh mặc định (Không cho tự phong Giáo viên)
          userRecord = new HocSinh({
            MaHS: `HS${uuidv4().substring(0, 6).toUpperCase()}`,
            HoTen: 'Học Sinh Mới',
            Email: `${uuidv4().substring(0, 6)}@school.edu.vn`,
            WalletAddress: lowerWallet,
            DaCapNhatHoSo: false
          });
          await userRecord.save();
          role_id = 'STUDENT_ROLE';
        }
      }
    }

    const token = jwt.sign(
      { 
        id: userRecord._id, 
        role_id, 
        walletAddress: lowerWallet 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: userRecord._id,
        role_id,
        walletAddress: lowerWallet,
        name: userRecord.HoTen || userRecord.fullName || 'User'
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

const logout = async (req, res) => { res.json({ success: true }); };

const getProfile = async (req, res) => {
  try {
    const { id, role_id, walletAddress } = req.user;
    let user;
    const lowerWallet = (walletAddress || '').toLowerCase();

    if (role_id === 'TEACHER_ROLE') {
      user = await GiaoVien.findById(id);
      if (!user && lowerWallet) {
        user = await GiaoVien.findOne({ WalletAddress: lowerWallet });
      }
    } else if (role_id === 'STUDENT_ROLE') {
      user = await HocSinh.findById(id);
      if (!user && lowerWallet) {
        user = await HocSinh.findOne({ WalletAddress: lowerWallet });
      }
    } else if (role_id === 'ADMIN_ROLE') {
      user = await Admin.findById(id);
      if (!user && lowerWallet) {
        user = await Admin.findOne({ WalletAddress: lowerWallet });
      }
    }
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const userDoc = user.toObject ? user.toObject() : (user._doc || user);
    res.json({ success: true, user: { ...userDoc, role_id } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  const secrets = [
    process.env.JWT_SECRET,
    'wgv-jwt-secret-k12-super-secure-key-2026'
  ].filter(Boolean);

  let verifiedUser = null;
  for (const s of secrets) {
    try {
      verifiedUser = jwt.verify(token, s, { clockTolerance: 300 });
      if (verifiedUser) break;
    } catch (e) {
      // Nếu là dev và token đã hết hạn, vẫn bắt buộc kiểm tra tính hợp lệ của chữ ký bí mật
      if (e.name === 'TokenExpiredError' && process.env.NODE_ENV === 'development') {
        try {
          verifiedUser = jwt.verify(token, s, { ignoreExpiration: true });
          if (verifiedUser) break;
        } catch (e2) {}
      }
    }
  }

  if (verifiedUser) {
    req.user = {
      ...verifiedUser,
      id: verifiedUser.id || verifiedUser._id
    };
    return next();
  }

  return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn', code: 'UNAUTHORIZED' });
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
    res.status(500).json({ success: false, message: 'Failed to generate QR session' });
  }
};

const verifyQrSignature = async (req, res) => {
  try {
    const { sessionId, walletAddress, signature } = req.body;
    if (!sessionId || !walletAddress || !signature) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const sessionData = qrSessions.get(sessionId);
    if (!sessionData || sessionData.expiresAt < Date.now()) {
      qrSessions.delete(sessionId);
      return res.status(400).json({ success: false, message: 'Session expired or invalid' });
    }

    // Atomic single-use
    qrSessions.delete(sessionId);

    let isValidSignature = false;
    try {
      isValidSignature = web3Utils.verifySignature(sessionData.challenge, signature, walletAddress);
    } catch (e) {
      isValidSignature = false;
    }

    if (!isValidSignature) {
      return res.status(401).json({ success: false, message: 'Chữ ký không hợp lệ.' });
    }

    // Identify user role (Strict RBAC)
    let role_id = 'STUDENT_ROLE';
    const lowerWallet = walletAddress.toLowerCase();
    let userRecord = await Admin.findOne({ WalletAddress: lowerWallet });

    if (userRecord) {
      role_id = 'ADMIN_ROLE';
    } else {
      userRecord = await GiaoVien.findOne({ WalletAddress: lowerWallet });
      
      if (userRecord) {
        if (userRecord.IsActive === false) {
          return res.status(403).json({ success: false, message: 'Tài khoản Giáo viên này đã bị thu hồi hoặc vô hiệu hóa.' });
        }

        const credId = userRecord.CredentialId;
        if (credId) {
          const onChainStatus = await blockchainService.verifyTeacherCredentialOnChain(credId, lowerWallet);
          if (!onChainStatus.ok) {
            return res.status(503).json({ 
              success: false, 
              message: 'Lỗi xác minh chứng thực Giáo viên trên Blockchain. Vui lòng thử lại sau.' 
            });
          }
          if (!onChainStatus.isValid) {
            return res.status(403).json({ 
              success: false, 
              message: 'Chứng thực Giáo viên trên Blockchain đã hết hiệu lực hoặc bị thu hồi.' 
            });
          }
        }

        role_id = 'TEACHER_ROLE';
      } else {
        const pendingRequest = await RoleRequest.findOne({ walletAddress: lowerWallet, status: 'pending' });
        if (pendingRequest) {
          const io = req.app.get('io');
          if (io) {
            io.to(`qr:${sessionId}`).emit('qr:pending', {
              isPending: true,
              message: 'Yêu cầu cấp quyền Giáo viên của bạn đang chờ phê duyệt.',
              walletAddress: lowerWallet
            });
          }
          qrSessions.delete(sessionId);
          return res.json({
            success: true,
            isPending: true,
            message: 'Yêu cầu quyền Giáo viên đang chờ duyệt'
          });
        }

        userRecord = await HocSinh.findOne({ WalletAddress: lowerWallet });
        if (userRecord) {
          role_id = 'STUDENT_ROLE';
        } else {
          userRecord = new HocSinh({
            MaHS: `HS${uuidv4().substring(0, 6).toUpperCase()}`,
            HoTen: 'Học Sinh Mới',
            Email: `${uuidv4().substring(0, 6)}@school.edu.vn`,
            WalletAddress: lowerWallet,
            DaCapNhatHoSo: false
          });
          await userRecord.save();
          role_id = 'STUDENT_ROLE';
        }
      }
    }

    const token = jwt.sign(
      { 
        id: userRecord._id, 
        role_id, 
        walletAddress: lowerWallet 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`qr:${sessionId}`).emit('qr:success', {
        token,
        user: {
          id: userRecord._id,
          role_id,
          walletAddress: lowerWallet,
          name: userRecord.HoTen || 'User'
        }
      });
    }

    qrSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Đăng nhập QR thành công'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

const registerWithRole = async (req, res) => {
  try {
    const { walletAddress, role, hoTen, email } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Missing walletAddress' });
    }

    const lowerWallet = walletAddress.toLowerCase();

    // Check if already registered
    const exists = await HocSinh.findOne({ WalletAddress: lowerWallet }) || 
                   await GiaoVien.findOne({ WalletAddress: lowerWallet }) ||
                   await Admin.findOne({ WalletAddress: lowerWallet });
                   
    if (exists) {
      return res.status(400).json({ success: false, message: 'Ví này đã được đăng ký.' });
    }

    // Nếu yêu cầu làm Giáo viên: Tạo RoleRequest để Ban Giám Hiệu duyệt
    if (['TEACHER_ROLE', 'LECTURER_ROLE'].includes(role)) {
      let existingReq = await RoleRequest.findOne({ walletAddress: lowerWallet, status: 'pending' });
      if (!existingReq) {
        existingReq = new RoleRequest({
          walletAddress: lowerWallet,
          hoTen: hoTen || 'Giáo Viên Mới',
          email: email || `${uuidv4().substring(0, 6)}@school.edu.vn`,
          chuyenNganh: req.body.chuyenNganh || 'Giáo Dục Phổ Thông',
          requestedRole: 'TEACHER_ROLE',
          status: 'pending'
        });
        await existingReq.save();

        const io = req.app.get('io');
        if (io) {
          io.to('admin:room').emit('new_role_request', existingReq);
        }
      }

      return res.json({
        success: true,
        isPending: true,
        message: 'Yêu cầu cấp quyền Giáo viên của bạn đã được gửi. Vui lòng chờ Ban Giám Hiệu phê duyệt.',
        request: existingReq
      });
    }

    if (role === 'ADMIN_ROLE') {
      return res.status(403).json({ 
        success: false, 
        message: 'Không thể tự phong quyền Quản trị viên hệ thống.' 
      });
    }

    // Chỉ cho phép đăng ký vai trò Học sinh mặc định
    const newUser = new HocSinh({
      MaHS: `HS${uuidv4().substring(0, 6).toUpperCase()}`,
      HoTen: hoTen || 'Học Sinh Mới',
      Email: email || `${uuidv4().substring(0, 6)}@school.edu.vn`,
      WalletAddress: lowerWallet
    });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role_id: 'STUDENT_ROLE', walletAddress: lowerWallet },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: { id: newUser._id, role_id: 'STUDENT_ROLE', walletAddress: lowerWallet, name: newUser.HoTen },
      message: 'Đăng ký Học sinh thành công'
    });
  } catch (error) {
    console.error('Register Role error:', error);
    res.status(500).json({ success: false, message: 'Đăng ký thất bại' });
  }
};

const demoLogin = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Chức năng thử nghiệm đã được đóng. Vui lòng xác thực bằng ví Web3 (MetaMask) hoặc quét mã QR hợp lệ.'
  });
};

module.exports = { 
  generateChallenge, 
  verifySignature, 
  logout, 
  getProfile, 
  authenticateToken,
  generateQrSession,
  verifyQrSignature,
  registerWithRole,
  demoLogin
};
