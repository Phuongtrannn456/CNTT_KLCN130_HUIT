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
          // 5. Ví chưa đăng ký -> Trả về needsRoleSelection để người dùng chọn vai trò
          return res.json({
            success: true,
            needsRoleSelection: true,
            walletAddress: lowerWallet,
            message: 'Ví chưa được liên kết với tài khoản nào. Vui lòng chọn vai trò để đăng ký.'
          });
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
          const io = req.app.get('io');
          if (io) {
            io.to(`qr:${sessionId}`).emit('qr:needsRoleSelection', {
              needsRoleSelection: true,
              walletAddress: lowerWallet,
              message: 'Ví chưa được liên kết với tài khoản nào.'
            });
          }
          qrSessions.delete(sessionId);
          return res.json({
            success: true,
            needsRoleSelection: true,
            walletAddress: lowerWallet,
            message: 'Ví chưa được liên kết với tài khoản nào.'
          });
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
    const { walletAddress, role, hoTen, email, maHS, chuyenNganh, toBoMon, khoiLop } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Missing walletAddress' });
    }

    const lowerWallet = walletAddress.toLowerCase();

    // Check if already registered
    const existsHocSinh = await HocSinh.findOne({ WalletAddress: lowerWallet });
    const existsGiaoVien = await GiaoVien.findOne({ WalletAddress: lowerWallet });
    const existsAdmin = await Admin.findOne({ WalletAddress: lowerWallet });

    if (existsGiaoVien || existsAdmin) {
      return res.status(400).json({ success: false, message: 'Ví này đã được liên kết với tài khoản khác trong hệ thống.' });
    }

    // Nếu đã tồn tại bản ghi HocSinh:
    // Nếu là bản ghi tự sinh (HoTen là "Học Sinh Mới" hoặc chưa cập nhật hồ sơ) và người dùng muốn đăng ký Giáo viên hoặc đăng ký lại thông tin chính xác:
    if (existsHocSinh) {
      if (existsHocSinh.HoTen === 'Học Sinh Mới') {
        await HocSinh.deleteOne({ _id: existsHocSinh._id });
      } else {
        return res.status(400).json({ success: false, message: 'Ví này đã được liên kết với một tài khoản Học sinh trong hệ thống.' });
      }
    }

    // A. KÍCH HOẠT TÀI KHOẢN GIÁO VIÊN (Yêu cầu Mã Giáo Viên & Mã PIN do trường cấp)
    if (['TEACHER_ROLE', 'LECTURER_ROLE'].includes(role)) {
      const maGV = req.body.maGV || req.body.teacherId || req.body.maHS;
      if (!maGV || !maGV.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp Mã Cán bộ / Giáo viên do nhà trường cấp.'
        });
      }

      const cleanMaGV = maGV.trim().toUpperCase();
      let teacher = await GiaoVien.findOne({
        MaGV: { $regex: new RegExp(`^${cleanMaGV}$`, 'i') }
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: `Mã giáo viên "${cleanMaGV}" không tồn tại trong danh mục nhân sự nhà trường. Vui lòng liên hệ Ban Giám Hiệu.`
        });
      }

      // Kiểm tra Mã PIN bảo mật nếu có
      const pin = req.body.pin || req.body.activationPin;
      if (teacher.ActivationPin) {
        if (!pin || !pin.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập Mã PIN bảo mật do Ban Giám Hiệu cấp.'
          });
        }
        if (teacher.ActivationPin.trim() !== pin.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Mã PIN bảo mật không chính xác. Vui lòng kiểm tra lại với Ban Giám Hiệu.'
          });
        }
      }

      // Kiểm tra nếu Mã GV đã được liên kết với một ví khác
      if (teacher.WalletAddress && 
          teacher.WalletAddress.toLowerCase() !== lowerWallet && 
          !teacher.WalletAddress.startsWith('0x0000000000000000000000000000000000000000')) {
        return res.status(400).json({
          success: false,
          message: `Mã giáo viên "${cleanMaGV}" (${teacher.HoTen}) đã được kích hoạt với một ví khác (${teacher.WalletAddress.substring(0, 6)}...${teacher.WalletAddress.slice(-4)}).`
        });
      }

      // Kích hoạt liên kết ví với Giáo viên
      teacher.WalletAddress = lowerWallet;
      teacher.IsActivated = true;
      teacher.ActivatedAt = new Date();
      teacher.ActivationPin = null; // Đã kích hoạt -> hủy mã PIN dùng 1 lần
      if (hoTen && hoTen.trim() && teacher.HoTen === 'Giáo Viên Mới') {
        teacher.HoTen = hoTen.trim();
      }
      await teacher.save();

      const token = jwt.sign(
        { id: teacher._id, role_id: 'TEACHER_ROLE', walletAddress: lowerWallet },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: { id: teacher._id, role_id: 'TEACHER_ROLE', walletAddress: lowerWallet, name: teacher.HoTen },
        message: `Kích hoạt thành công! Kính chào Thầy/Cô ${teacher.HoTen} (${teacher.MaGV})`
      });
    }

    if (role === 'ADMIN_ROLE') {
      return res.status(403).json({ 
        success: false, 
        message: 'Không thể tự phong quyền Quản trị viên hệ thống.' 
      });
    }

    // B. KÍCH HOẠT TÀI KHOẢN HỌC SINH (Yêu cầu Mã Học Sinh + Mã PIN bí mật 6 số do trường cấp)
    if (!maHS || !maHS.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Mã Học Sinh (Mã HS) do nhà trường cấp để liên kết ví.'
      });
    }

    const cleanMaHS = maHS.trim().toUpperCase();

    // 1. Kiểm tra đối chiếu với Danh sách Học sinh chính thức của trường
    let student = await HocSinh.findOne({
      MaHS: { $regex: new RegExp(`^${cleanMaHS}$`, 'i') }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Mã học sinh "${cleanMaHS}" không tồn tại trong danh sách của nhà trường. Vui lòng kiểm tra lại hoặc liên hệ Văn phòng trường / GVCN.`
      });
    }

    // 2. Kiểm tra Mã PIN bí mật 6 số (Chống cướp tài khoản, đảm bảo chính chủ học sinh)
    const pin = req.body.pin || req.body.activationPin;
    if (student.ActivationPin) {
      if (!pin || !pin.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập Mã PIN kích hoạt 6 số do nhà trường cấp.'
        });
      }
      if (student.ActivationPin.trim() !== pin.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mã PIN kích hoạt không chính xác! Vui lòng kiểm tra lại phiếu thông tin do nhà trường cấp.'
        });
      }
    }

    // 3. Chống gian lận: 1 Mã Học Sinh chỉ được liên kết với 1 ví MetaMask duy nhất
    if (student.WalletAddress && 
        student.WalletAddress.toLowerCase() !== lowerWallet && 
        !student.WalletAddress.startsWith('0x0000000000000000000000000000000000000000')) {
      return res.status(400).json({
        success: false,
        message: `Mã học sinh "${cleanMaHS}" (${student.HoTen}) đã được kích hoạt với một ví khác (${student.WalletAddress.substring(0, 6)}...${student.WalletAddress.slice(-4)}). Nếu bạn làm mất ví hoặc đổi thiết bị, vui lòng liên hệ Ban Giám Hiệu/GVCN để cấp lại mã PIN mới.`
      });
    }

    // 4. Liên kết ví MetaMask vào hồ sơ học sinh chính thức
    student.WalletAddress = lowerWallet;
    student.DaCapNhatHoSo = true;
    student.IsActivated = true;
    student.ActivatedAt = new Date();
    student.ActivationPin = null; // Đã kích hoạt -> hủy mã PIN
    if (hoTen && hoTen.trim() && (student.HoTen === 'Học Sinh Mới' || !student.HoTen)) {
      student.HoTen = hoTen.trim();
    }
    if (email && email.trim() && (!student.Email || student.Email.includes('@school.edu.vn'))) {
      student.Email = email.trim();
    }
    if (khoiLop) {
      student.KhoiLop = Number(khoiLop);
    }
    await student.save();

    const token = jwt.sign(
      { id: student._id, role_id: 'STUDENT_ROLE', walletAddress: lowerWallet },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: { id: student._id, role_id: 'STUDENT_ROLE', walletAddress: lowerWallet, name: student.HoTen, maHS: student.MaHS },
      message: `Kích hoạt thành công! Xin chào học sinh ${student.HoTen} (${student.MaHS})`
    });
  } catch (error) {
    console.error('Register Role error:', error);
    res.status(500).json({ success: false, message: 'Kích hoạt tài khoản thất bại: ' + error.message });
  }
};

const demoLogin = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Chức năng thử nghiệm đã được đóng. Vui lòng xác thực bằng ví Web3 (MetaMask) hoặc quét mã QR hợp lệ.'
  });
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { skills, department, gradeLevel, school, chuyenNganh } = req.body;
    
    let user = await HocSinh.findById(id);
    if (!user) user = await GiaoVien.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    if (skills && Array.isArray(skills)) user.skills = skills;
    if (department) user.department = department;
    if (chuyenNganh) user.ChuyenNganh = chuyenNganh;
    if (school) user.school = school;

    // Quy định Khối lớp: Học sinh chỉ được chọn 1 lần duy nhất khi tạo mới hồ sơ.
    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      const numericGrade = typeof gradeLevel === 'number' 
        ? gradeLevel 
        : parseInt(String(gradeLevel).replace(/\D/g, ''), 10);

      if (!isNaN(numericGrade) && numericGrade >= 1 && numericGrade <= 12) {
        const isAdmin = req.user?.role === 'admin' || req.user?.role_id === 'ADMIN_ROLE';
        if (!user.KhoiLop || isAdmin) {
          user.KhoiLop = numericGrade;
        }
      }
    }
    user.DaCapNhatHoSo = true;
    await user.save();
    res.json({ success: true, message: 'Cập nhật hồ sơ thành công', user: user.toJSON ? user.toJSON() : user });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật hồ sơ: ' + error.message });
  }
};

module.exports = { 
  generateChallenge, 
  verifySignature, 
  logout, 
  getProfile, 
  updateProfile,
  authenticateToken,
  generateQrSession,
  verifyQrSignature,
  registerWithRole,
  demoLogin
};
