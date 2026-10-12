const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const GiaoVien = require('../models/GiaoVien');
const HocSinh = require('../models/HocSinh');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
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

// Đồng bộ 2 chiều giữa mô hình Legacy (GiaoVien, HocSinh) và K-12 (Teacher, Student) để tương thích 100%
const ensureUserDualSync = async (userRecord, role_id) => {
  try {
    if (role_id === 'TEACHER_ROLE') {
      const wallet = (userRecord.WalletAddress || userRecord.walletAddress || '').toLowerCase();
      // Nếu là GiaoVien, đảm bảo Teacher có cùng _id
      if (userRecord.MaGV) {
        await Teacher.findOneAndUpdate(
          { walletAddress: wallet },
          {
            $setOnInsert: { _id: userRecord._id },
            teacherId: userRecord.MaGV,
            fullName: userRecord.HoTen,
            email: userRecord.Email,
            department: userRecord.ToBoMon || userRecord.ChuyenNganh || '',
            homeroomClass: userRecord.ChuNhiemLop || '',
            walletAddress: wallet,
            credentialId: userRecord.CredentialId || null,
            isActive: userRecord.IsActive !== false
          },
          { upsert: true, new: true }
        );
      } else if (userRecord.teacherId) {
        // Nếu là Teacher, đảm bảo GiaoVien có cùng _id
        await GiaoVien.findOneAndUpdate(
          { WalletAddress: wallet },
          {
            $setOnInsert: { _id: userRecord._id },
            MaGV: userRecord.teacherId,
            HoTen: userRecord.fullName,
            Email: userRecord.email,
            ChuyenNganh: userRecord.department || '',
            ToBoMon: userRecord.department || '',
            ChuNhiemLop: userRecord.homeroomClass || '',
            WalletAddress: wallet,
            CredentialId: userRecord.credentialId || null,
            IsActive: userRecord.isActive !== false
          },
          { upsert: true, new: true }
        );
      }
    } else if (role_id === 'STUDENT_ROLE') {
      const wallet = (userRecord.WalletAddress || userRecord.walletAddress || '').toLowerCase();
      // Nếu là HocSinh, đảm bảo Student có cùng _id
      if (userRecord.MaHS) {
        await Student.findOneAndUpdate(
          { walletAddress: wallet },
          {
            $setOnInsert: { _id: userRecord._id },
            studentId: userRecord.MaHS,
            fullName: userRecord.HoTen,
            email: userRecord.Email,
            gradeLevel: userRecord.KhoiLop || 10,
            school: userRecord.TruongHoc || '',
            conduct: userRecord.HanhKiem || 'Tốt',
            gpa: userRecord.DiemTongKet || userRecord.GPA || 0,
            skills: userRecord.KyNang || [],
            walletAddress: wallet,
            profileUpdated: userRecord.DaCapNhatHoSo || false
          },
          { upsert: true, new: true }
        );
      } else if (userRecord.studentId) {
        // Nếu là Student, đảm bảo HocSinh có cùng _id
        await HocSinh.findOneAndUpdate(
          { WalletAddress: wallet },
          {
            $setOnInsert: { _id: userRecord._id },
            MaHS: userRecord.studentId,
            HoTen: userRecord.fullName,
            Email: userRecord.email,
            KhoiLop: userRecord.gradeLevel || 10,
            TruongHoc: userRecord.school || '',
            HanhKiem: userRecord.conduct || 'Tốt',
            DiemTongKet: userRecord.gpa || 0,
            GPA: userRecord.gpa || 0,
            KyNang: userRecord.skills || [],
            WalletAddress: wallet,
            DaCapNhatHoSo: userRecord.profileUpdated || false
          },
          { upsert: true, new: true }
        );
      }
    }
  } catch (err) {
    // Không block luồng chính nếu sync gặp lỗi
    console.warn('[AUTH] Dual sync warning:', err.message);
  }
};

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
    
    // 1. Kiểm tra Admin ứng dụng (Cấu hình riêng biệt)
    let userRecord = await Admin.findOne({ WalletAddress: lowerWallet });
    if (userRecord) {
      role_id = 'ADMIN_ROLE';
    } else {
      // 2. Kiểm tra Giáo viên
      userRecord = await GiaoVien.findOne({ WalletAddress: lowerWallet }) ||
                   await Teacher.findOne({ walletAddress: lowerWallet });
      
      if (userRecord) {
        // Kiểm tra trạng thái hoạt động trong database
        if (userRecord.isActive === false || userRecord.IsActive === false) {
          return res.status(403).json({ success: false, message: 'Tài khoản Giáo viên này đã bị thu hồi hoặc vô hiệu hóa.' });
        }

        // Nếu giáo viên có gắn Credential ID, xác minh On-Chain tính hợp lệ
        const credId = userRecord.credentialId || userRecord.CredentialId;
        if (credId) {
          const onChainStatus = await blockchainService.verifyTeacherCredentialOnChain(credId, lowerWallet);
          if (!onChainStatus.ok) {
            // Lỗi RPC Blockchain -> Fail-safe: Báo lỗi rõ ràng, không âm thầm cấp quyền sai
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
        await ensureUserDualSync(userRecord, role_id);
      } else {
        // 3. Kiểm tra Học sinh hiện có
        userRecord = await HocSinh.findOne({ WalletAddress: lowerWallet }) ||
                     await Student.findOne({ walletAddress: lowerWallet });
        
        if (userRecord) {
          role_id = 'STUDENT_ROLE';
          await ensureUserDualSync(userRecord, role_id);
        } else {
          // 4. Ví mới hoàn toàn -> Tự động khởi tạo Học sinh mặc định (Không cho tự phong Giáo viên)
          userRecord = new HocSinh({
            MaHS: `HS${uuidv4().substring(0, 6).toUpperCase()}`,
            HoTen: 'Học Sinh Mới',
            Email: `${uuidv4().substring(0, 6)}@school.edu.vn`,
            WalletAddress: lowerWallet,
            DaCapNhatHoSo: false
          });
          await userRecord.save();
          role_id = 'STUDENT_ROLE';
          await ensureUserDualSync(userRecord, role_id);
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
    const { id, role_id } = req.user;
    let user;
    if (role_id === 'TEACHER_ROLE') {
      user = await GiaoVien.findById(id);
    } else if (role_id === 'STUDENT_ROLE') {
      user = await HocSinh.findById(id);
    } else if (role_id === 'ADMIN_ROLE') {
      user = await Admin.findById(id);
    }
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { ...user._doc, role_id } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', { clockTolerance: 300 }, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
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
      userRecord = await GiaoVien.findOne({ WalletAddress: lowerWallet }) ||
                   await Teacher.findOne({ walletAddress: lowerWallet });
      
      if (userRecord) {
        if (userRecord.isActive === false || userRecord.IsActive === false) {
          return res.status(403).json({ success: false, message: 'Tài khoản Giáo viên này đã bị thu hồi hoặc vô hiệu hóa.' });
        }

        const credId = userRecord.credentialId || userRecord.CredentialId;
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
        await ensureUserDualSync(userRecord, role_id);
      } else {
        userRecord = await HocSinh.findOne({ WalletAddress: lowerWallet }) ||
                     await Student.findOne({ walletAddress: lowerWallet });
        if (userRecord) {
          role_id = 'STUDENT_ROLE';
          await ensureUserDualSync(userRecord, role_id);
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
          await ensureUserDualSync(userRecord, role_id);
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
          name: userRecord.HoTen || userRecord.fullName || 'User'
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

    // Bảo mật RBAC: Chặn việc client tự gửi role = TEACHER_ROLE để tự cấp quyền
    if (role === 'TEACHER_ROLE') {
      return res.status(403).json({ 
        success: false, 
        message: 'Không thể tự phong quyền Giáo viên. Quyền Giáo viên cần được Ban Giám Hiệu cấp chứng thực On-Chain.' 
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
    await ensureUserDualSync(newUser, 'STUDENT_ROLE');

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

    return res.status(400).json({ success: false, message: 'Role không hợp lệ.' });

  } catch (error) {
    console.error('Register Role error:', error);
    res.status(500).json({ success: false, message: 'Đăng ký thất bại' });
  }
};

module.exports = { 
  generateChallenge, 
  verifySignature, 
  logout, 
  getProfile, 
  authenticateToken,
  generateQrSession,
  verifyQrSignature,
  registerWithRole
};
