const crypto = require('crypto');
const QrCode = require('../models/QrCode');
const GiaoVien = require('../models/GiaoVien');
const HocSinh = require('../models/HocSinh');
const Admin = require('../models/Admin');

const resolveWalletAddress = async (user) => {
  if (user.walletAddress) return user.walletAddress.toLowerCase();
  
  let doc;
  if (user.role_id === 'TEACHER_ROLE' || user.role_id === 'LECTURER_ROLE') {
    doc = await GiaoVien.findById(user.id);
  } else if (user.role_id === 'ADMIN_ROLE') {
    doc = await Admin.findById(user.id);
  } else {
    doc = await HocSinh.findById(user.id);
  }
  return (doc?.WalletAddress || doc?.walletAddress || '').toLowerCase();
};

const qrController = {
  // Lấy mã QR hiện tại của user
  getQrCode: async (req, res) => {
    try {
      const { id: userId, role_id } = req.user;
      const walletAddress = await resolveWalletAddress(req.user);

      let effectiveUserId = userId;
      if (walletAddress) {
        let localDoc = null;
        if (role_id === 'TEACHER_ROLE' || role_id === 'LECTURER_ROLE') {
          localDoc = await GiaoVien.findOne({ WalletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
        } else if (role_id === 'ADMIN_ROLE') {
          localDoc = await Admin.findOne({ WalletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
        } else {
          localDoc = await HocSinh.findOne({ WalletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
        }
        if (localDoc) {
          effectiveUserId = localDoc._id;
        }
      }

      let qrCode = await QrCode.findOne({
        $or: [
          { user_id: effectiveUserId },
          { wallet_address: walletAddress }
        ],
        status: 'active'
      });

      if (!qrCode) {
        // Nếu chưa có, tự động tạo một cái mới
        const newHash = crypto.randomBytes(32).toString('hex');
        
        // Xác định role model dựa trên role_id
        const roleModel = (role_id === 'TEACHER_ROLE' || role_id === 'LECTURER_ROLE') ? 'GiaoVien' : (role_id === 'ADMIN_ROLE' ? 'Admin' : 'HocSinh');

        qrCode = new QrCode({
          user_id: effectiveUserId,
          wallet_address: walletAddress,
          role: role_id,
          role_model: roleModel,
          qr_hash: newHash,
          status: 'active'
        });
        await qrCode.save();
      }

      res.status(200).json({
        success: true,
        data: qrCode
      });
    } catch (error) {
      console.error('[QR Controller] Error in getQrCode:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi lấy mã QR' });
    }
  },

  // Tạo mã QR mới (vô hiệu hóa mã cũ)
  generateQrCode: async (req, res) => {
    try {
      const { id: userId, role_id } = req.user;
      const walletAddress = await resolveWalletAddress(req.user);

      let effectiveUserId = userId;
      if (walletAddress) {
        let localDoc = null;
        if (role_id === 'TEACHER_ROLE' || role_id === 'LECTURER_ROLE') {
          localDoc = await GiaoVien.findOne({ WalletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
        } else if (role_id === 'ADMIN_ROLE') {
          localDoc = await Admin.findOne({ WalletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
        } else {
          localDoc = await HocSinh.findOne({ WalletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
        }
        if (localDoc) {
          effectiveUserId = localDoc._id;
        }
      }

      // Vô hiệu hóa mã cũ
      await QrCode.updateMany(
        { $or: [{ user_id: effectiveUserId }, { wallet_address: walletAddress }] },
        { $set: { status: 'inactive' } }
      );

      const newHash = crypto.randomBytes(32).toString('hex');
      const roleModel = (role_id === 'TEACHER_ROLE' || role_id === 'LECTURER_ROLE') ? 'GiaoVien' : (role_id === 'ADMIN_ROLE' ? 'Admin' : 'HocSinh');

      const newQrCode = new QrCode({
        user_id: effectiveUserId,
        wallet_address: walletAddress,
        role: role_id,
        role_model: roleModel,
        qr_hash: newHash,
        status: 'active'
      });
      await newQrCode.save();

      res.status(200).json({
        success: true,
        message: 'Tạo mã QR mới thành công',
        data: newQrCode
      });
    } catch (error) {
      console.error('[QR Controller] Error in generateQrCode:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tạo mã QR mới' });
    }
  }
};

module.exports = qrController;
