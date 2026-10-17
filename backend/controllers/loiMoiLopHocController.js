const LoiMoiLopHoc = require('../models/LoiMoiLopHoc');
const LopHoc = require('../models/LopHoc');
const HocSinh = require('../models/HocSinh');
const logger = require('../config/logger');

// Giáo viên mời 1 học sinh vào lớp
exports.inviteHocSinh = async (req, res) => {
  try {
    const { lopId } = req.params;
    const { hocSinhId, maHS } = req.body;
    const studentCode = maHS;

    if (!hocSinhId && !studentCode) {
      return res.status(400).json({ success: false, message: 'Thiếu hocSinhId hoặc maHS' });
    }

    // Tìm học sinh
    let hs;
    if (hocSinhId) {
      hs = await HocSinh.findById(hocSinhId);
    } else {
      hs = await HocSinh.findOne({ MaHS: studentCode });
    }
    if (!hs) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
    }

    // Tìm lớp học
    const lopHoc = await LopHoc.findById(lopId);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    // Kiểm tra học sinh đã có trong lớp chưa
    if (lopHoc.HocSinh.some(hsId => hsId.equals(hs._id))) {
      return res.status(409).json({ success: false, message: 'Học sinh đã có trong lớp này' });
    }

    // Kiểm tra đã có lời mời pending chưa
    const existing = await LoiMoiLopHoc.findOne({ LopHoc: lopId, HocSinh: hs._id });
    if (existing) {
      if (existing.TrangThai === 'ChoChapNhan') {
        return res.status(409).json({ success: false, message: 'Đã gửi lời mời cho học sinh này rồi' });
      }
      // Nếu đã từ chối trước đó → cho phép mời lại
      if (existing.TrangThai === 'TuChoi' || existing.TrangThai === 'DaChapNhan') {
        existing.TrangThai = 'ChoChapNhan';
        await existing.save();
        logger.info(`[LoiMoiLopHoc] Re-invited HS ${hs.MaHS} to class ${lopHoc.MaLopHoc}`);
        return res.json({ success: true, message: 'Đã gửi lại lời mời cho học sinh', data: existing });
      }
    }

    const loiMoi = new LoiMoiLopHoc({
      LopHoc: lopId,
      HocSinh: hs._id,
      GiaoVien: lopHoc.GiaoVien,
      TrangThai: 'ChoChapNhan'
    });
    await loiMoi.save();

    logger.info(`[LoiMoiLopHoc] Invited HS ${hs.MaHS} to class ${lopHoc.MaLopHoc}`);
    res.status(201).json({ success: true, message: 'Đã gửi lời mời. Chờ học sinh chấp nhận.', data: loiMoi });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] inviteHocSinh error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi gửi lời mời' });
  }
};

// Giáo viên mời batch học sinh vào lớp
exports.inviteBatch = async (req, res) => {
  try {
    const { lopId } = req.params;
    const { danhSachMaHS } = req.body;

    if (!danhSachMaHS || !Array.isArray(danhSachMaHS)) {
      return res.status(400).json({ success: false, message: 'Danh sách mã học sinh không hợp lệ' });
    }

    const lopHoc = await LopHoc.findById(lopId);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const hsList = await HocSinh.find({ MaHS: { $in: danhSachMaHS } });
    const currentHsIds = lopHoc.HocSinh.map(id => id.toString());

    let invitedCount = 0;
    const duplicateHS = [];
    const alreadyInClass = [];
    const notFoundMaHS = [...danhSachMaHS];

    for (const hs of hsList) {
      const idx = notFoundMaHS.indexOf(hs.MaHS);
      if (idx > -1) notFoundMaHS.splice(idx, 1);

      // Đã có trong lớp → bỏ qua
      if (currentHsIds.includes(hs._id.toString())) {
        alreadyInClass.push(hs.MaHS);
        continue;
      }

      // Kiểm tra lời mời đã tồn tại
      const existing = await LoiMoiLopHoc.findOne({ LopHoc: lopId, HocSinh: hs._id });
      if (existing) {
        if (existing.TrangThai === 'ChoChapNhan') {
          duplicateHS.push(hs.MaHS);
          continue;
        }
        // Re-invite nếu đã từ chối / đã chấp nhận trước đó
        existing.TrangThai = 'ChoChapNhan';
        await existing.save();
        invitedCount++;
        continue;
      }

      await LoiMoiLopHoc.create({
        LopHoc: lopId,
        HocSinh: hs._id,
        GiaoVien: lopHoc.GiaoVien,
        TrangThai: 'ChoChapNhan'
      });
      invitedCount++;
    }

    logger.info(`[LoiMoiLopHoc] Batch invite to ${lopHoc.MaLopHoc}: invited=${invitedCount}, duplicate=${duplicateHS.length}, inClass=${alreadyInClass.length}, notFound=${notFoundMaHS.length}`);

    res.json({
      success: true,
      message: `Đã gửi lời mời: ${invitedCount}, đã mời trước: ${duplicateHS.length}, đã trong lớp: ${alreadyInClass.length}, không tìm thấy: ${notFoundMaHS.length}`,
      data: {
        invitedCount,
        duplicateHS,
        alreadyInClass,
        notFoundMaHS
      }
    });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] inviteBatch error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi import lời mời' });
  }
};

// Học sinh respond lời mời (chấp nhận / từ chối)
exports.respondToInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;

    const loiMoi = await LoiMoiLopHoc.findById(id)
      .populate('LopHoc', 'MaLopHoc TenLopHoc')
      .populate('HocSinh', 'MaHS HoTen WalletAddress');

    if (!loiMoi) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    if (loiMoi.TrangThai !== 'ChoChapNhan') {
      return res.status(400).json({ success: false, message: 'Lời mời đã được xử lý trước đó' });
    }

    // Xác thực: HS phải là chủ lời mời
    const requesterId = req.user?.id || req.user?._id;
    const userWallet = (req.user?.walletAddress || req.user?.WalletAddress || '').toLowerCase();
    const isDirectMatch = requesterId && (loiMoi.HocSinh._id.toString() === requesterId.toString());
    const isWalletMatch = userWallet && (
      (loiMoi.HocSinh.WalletAddress && loiMoi.HocSinh.WalletAddress.toLowerCase() === userWallet) ||
      (loiMoi.HocSinh.walletAddress && loiMoi.HocSinh.walletAddress.toLowerCase() === userWallet)
    );
    const isAdmin = req.user?.role === 'ADMIN_ROLE';

    if (!isDirectMatch && !isWalletMatch && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Bạn không phải người được mời' });
    }

    if (accept) {
      loiMoi.TrangThai = 'DaChapNhan';
      await loiMoi.save();

      // Push HS vào LopHoc.HocSinh[]
      const lopHoc = await LopHoc.findById(loiMoi.LopHoc._id);
      if (lopHoc && !lopHoc.HocSinh.some(hsId => hsId.equals(loiMoi.HocSinh._id))) {
        lopHoc.HocSinh.push(loiMoi.HocSinh._id);
        await lopHoc.save();
      }

      logger.info(`[LoiMoiLopHoc] HS ${loiMoi.HocSinh.MaHS} accepted invite to class ${loiMoi.LopHoc.MaLopHoc}`);
      res.json({ success: true, message: 'Đã chấp nhận lời mời. Bạn đã được thêm vào lớp.' });
    } else {
      loiMoi.TrangThai = 'TuChoi';
      await loiMoi.save();

      logger.info(`[LoiMoiLopHoc] HS ${loiMoi.HocSinh.MaHS} rejected invite to class ${loiMoi.LopHoc.MaLopHoc}`);
      res.json({ success: true, message: 'Đã từ chối lời mời.' });
    }
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] respondToInvite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xử lý lời mời' });
  }
};

// Lấy danh sách lời mời của 1 lớp (cho giáo viên)
exports.getInvitesByLopHoc = async (req, res) => {
  try {
    const { lopId } = req.params;
    const invites = await LoiMoiLopHoc.find({ LopHoc: lopId })
      .populate('HocSinh', 'MaHS HoTen Email GPA ChuyenNganh')
      .populate('GiaoVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] getInvitesByLopHoc error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lời mời' });
  }
};

// Lấy danh sách lời mời lớp học của học sinh (pending)
exports.getMyClassInvites = async (req, res) => {
  try {
    const { hsId } = req.params;
    const invites = await LoiMoiLopHoc.find({
      HocSinh: hsId,
      TrangThai: 'ChoChapNhan'
    })
      .populate({
        path: 'LopHoc',
        select: 'MaLopHoc TenLopHoc',
        populate: { path: 'MonHoc', select: 'MaMonHoc TenMonHoc' }
      })
      .populate('GiaoVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] getMyClassInvites error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy lời mời lớp học' });
  }
};

// Giáo viên hủy lời mời đang pending
exports.cancelInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const loiMoi = await LoiMoiLopHoc.findById(id);

    if (!loiMoi) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    if (loiMoi.TrangThai !== 'ChoChapNhan') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy lời mời đang chờ' });
    }

    await LoiMoiLopHoc.findByIdAndDelete(id);

    logger.info(`[LoiMoiLopHoc] Cancelled invite ${id}`);
    res.json({ success: true, message: 'Đã hủy lời mời' });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] cancelInvite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi hủy lời mời' });
  }
};
