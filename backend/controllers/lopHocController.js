const LopHoc = require('../models/LopHoc');
const HocSinh = require('../models/HocSinh');
const DangKyDeTai = require('../models/DangKyDeTai');
const DeTai = require('../models/DeTai');
const Nhom = require('../models/Nhom');
const logger = require('../config/logger');

const _lopHocCache = new Map();
const LOPHOC_CACHE_TTL = 30 * 1000;

function invalidateLopHocCache(gvId) {
  if (gvId) {
    _lopHocCache.delete(String(gvId));
  } else {
    _lopHocCache.clear();
  }
}

// Lấy danh sách lớp học của giáo viên
exports.getByGiaoVien = async (req, res) => {
  try {
    const { gvId } = req.params;
    const cached = _lopHocCache.get(String(gvId));
    if (cached && Date.now() - cached.ts < LOPHOC_CACHE_TTL) {
      return res.json({ success: true, data: cached.data });
    }

    const lopHocs = await LopHoc.find({ GiaoVien: gvId })
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiaoVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    const result = lopHocs.map(lh => ({
      ...lh.toObject(),
      siSo: lh.HocSinh ? lh.HocSinh.length : 0
    }));

    _lopHocCache.set(String(gvId), { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[LopHoc] getByGiaoVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lớp học' });
  }
};

// Lấy chi tiết lớp học: danh sách SV + nhóm + đề tài đã đăng ký
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const lopHoc = await LopHoc.findById(id)
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiaoVien', 'HoTen MaGV')
      .populate('HocSinh', 'MaHS HoTen Email GPA ChuyenNganh KyNang WalletAddress DaCapNhatHoSo');

    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    // MỚI: Query trực tiếp theo LopHoc, fallback MonHoc cho data cũ
    let deTais = await DeTai.find({ LopHoc: id }).select('_id MaDeTai TenDeTai TrangThai SoLuongHocSinh');
    if (deTais.length === 0) {
      deTais = await DeTai.find({ MonHoc: lopHoc.MonHoc._id }).select('_id MaDeTai TenDeTai TrangThai SoLuongHocSinh');
    }

    // Lấy danh sách đăng ký đề tài của các SV trong lớp
    const hsIds = lopHoc.HocSinh.map(sv => sv._id);
    const dangKys = await DangKyDeTai.find({
      DeTai: { $in: deTais.map(dt => dt._id) }
    })
      .populate('DeTai', 'MaDeTai TenDeTai TrangThai')
      .populate('Nhom')
      .populate('TruongNhom', 'MaHS HoTen')
      .populate('HocSinh', 'MaHS HoTen')
      .populate('ThanhVien.HocSinh', 'MaHS HoTen');

    // Lọc ra chỉ những đăng ký có liên quan đến SV trong lớp
    const filteredDangKys = dangKys.filter(dk => {
      // Kiểm tra trưởng nhóm có thuộc lớp không
      if (dk.TruongNhom && hsIds.some(id => id.equals(dk.TruongNhom._id))) return true;
      // Kiểm tra học sinh đơn lẻ
      if (dk.HocSinh && hsIds.some(id => id.equals(dk.HocSinh._id))) return true;
      // Kiểm tra thành viên nhóm
      if (dk.ThanhVien && dk.ThanhVien.some(tv =>
        tv.HocSinh && hsIds.some(id => id.equals(tv.HocSinh._id))
      )) return true;
      return false;
    });

    res.json({
      success: true,
      data: {
        lopHoc: lopHoc.toObject(),
        deTais,
        dangKys: filteredDangKys
      }
    });
  } catch (error) {
    logger.error(`[LopHoc] getDetail error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết lớp học' });
  }
};

// Tạo lớp học mới
exports.create = async (req, res) => {
  try {
    const { MaLopHoc, TenLopHoc, MonHoc, GiaoVien } = req.body;

    if (!MaLopHoc || !TenLopHoc || !MonHoc || !GiaoVien) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const existing = await LopHoc.findOne({ MaLopHoc, MonHoc });
    if (existing) {
      return res.status(409).json({ success: false, message: `Lớp '${MaLopHoc}' đã tồn tại cho môn học này` });
    }

    const lopHoc = new LopHoc({ MaLopHoc, TenLopHoc, MonHoc, GiaoVien, HocSinh: [] });
    await lopHoc.save();

    const populated = await LopHoc.findById(lopHoc._id)
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiaoVien', 'HoTen MaGV');

    logger.info(`[LopHoc] Created: ${MaLopHoc} - ${TenLopHoc}`);
    invalidateLopHocCache(GiaoVien);
    res.status(201).json({ success: true, data: { ...populated.toObject(), siSo: 0 } });
  } catch (error) {
    logger.error(`[LopHoc] create error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi tạo lớp học' });
  }
};

// Cập nhật lớp học
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenLopHoc, MonHoc } = req.body;

    const updateData = {};
    if (TenLopHoc) updateData.TenLopHoc = TenLopHoc;
    if (MonHoc) updateData.MonHoc = MonHoc;

    const lopHoc = await LopHoc.findByIdAndUpdate(id, updateData, { new: true })
      .populate('MonHoc', 'MaMonHoc TenMonHoc');

    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    logger.info(`[LopHoc] Updated: ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, data: lopHoc });
  } catch (error) {
    logger.error(`[LopHoc] update error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật lớp học' });
  }
};

// Thêm học sinh vào lớp
exports.addHocSinh = async (req, res) => {
  try {
    const { id } = req.params;
    let { hocSinhId, maSV } = req.body;

    if (!hocSinhId && !maSV) {
      return res.status(400).json({ success: false, message: 'Thiếu hocSinhId hoặc maSV' });
    }

    // Kiểm tra SV tồn tại
    let sv;
    if (hocSinhId) {
      sv = await HocSinh.findById(hocSinhId);
    } else {
      sv = await HocSinh.findOne({ MaHS: maSV });
    }
    if (!sv) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
    }
    hocSinhId = sv._id;

    const lopHoc = await LopHoc.findById(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    // Kiểm tra SV đã có trong lớp chưa
    if (lopHoc.HocSinh.some(hsId => hsId.equals(hocSinhId))) {
      return res.status(409).json({ success: false, message: 'Học sinh đã có trong lớp này' });
    }

    lopHoc.HocSinh.push(hocSinhId);
    await lopHoc.save();

    const updated = await LopHoc.findById(id)
      .populate('HocSinh', 'MaHS HoTen Email GPA ChuyenNganh');

    logger.info(`[LopHoc] Added SV ${sv.MaHS} to class ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(`[LopHoc] addHocSinh error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi thêm học sinh vào lớp' });
  }
};

// Xóa học sinh khỏi lớp
exports.removeHocSinh = async (req, res) => {
  try {
    const { id, hsId } = req.params;

    const lopHoc = await LopHoc.findById(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    lopHoc.HocSinh = lopHoc.HocSinh.filter(s => !s.equals(hsId));
    await lopHoc.save();

    logger.info(`[LopHoc] Removed SV ${hsId} from class ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, message: 'Đã xóa học sinh khỏi lớp' });
  } catch (error) {
    logger.error(`[LopHoc] removeHocSinh error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xóa học sinh khỏi lớp' });
  }
};

// Xóa lớp học
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const lopHoc = await LopHoc.findByIdAndDelete(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    logger.info(`[LopHoc] Deleted: ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, message: 'Đã xóa lớp học' });
  } catch (error) {
    logger.error(`[LopHoc] delete error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xóa lớp học' });
  }
};

// Import batch học sinh vào lớp
exports.importHocSinh = async (req, res) => {
  try {
    const { id } = req.params;
    const { danhSachMaHS } = req.body;

    if (!danhSachMaHS || !Array.isArray(danhSachMaHS)) {
      return res.status(400).json({ success: false, message: 'Danh sách mã học sinh không hợp lệ' });
    }

    const lopHoc = await LopHoc.findById(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const svList = await HocSinh.find({ MaHS: { $in: danhSachMaHS } });
    
    let addedCount = 0;
    const duplicateSV = [];
    const notFoundMaHS = [...danhSachMaHS];

    svList.forEach(sv => {
      const index = notFoundMaHS.indexOf(sv.MaHS);
      if (index > -1) {
        notFoundMaHS.splice(index, 1);
      }

      const exists = lopHoc.HocSinh.some(hsId => hsId.equals(sv._id));
      if (!exists) {
        lopHoc.HocSinh.push(sv._id);
        addedCount++;
      } else {
        duplicateSV.push(sv.MaHS);
      }
    });

    if (addedCount > 0) {
      await lopHoc.save();
    }

    res.json({
      success: true,
      message: `Import thành công. Thêm mới: ${addedCount}, trùng lặp: ${duplicateSV.length}, không tìm thấy: ${notFoundMaHS.length}`,
      data: {
        addedCount,
        duplicateSV,
        notFoundMaHS
      }
    });
  } catch (error) {
    logger.error(`[LopHoc] importHocSinh error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi import học sinh' });
  }
};

// Lấy lớp học của học sinh
exports.getByHocSinh = async (req, res) => {
  try {
    const { hsId } = req.params;
    const lopHocs = await LopHoc.find({ HocSinh: hsId })
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiaoVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    const result = lopHocs.map(lh => ({
      ...lh.toObject(),
      siSo: lh.HocSinh ? lh.HocSinh.length : 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[LopHoc] getByHocSinh error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy lớp học của học sinh' });
  }
};

// Lấy danh sách học sinh thuộc các lớp của giáo viên (flat list kèm context lớp/môn/GV)
exports.getHocSinhByGiaoVien = async (req, res) => {
  try {
    const { gvId } = req.params;
    const lopHocs = await LopHoc.find({ GiaoVien: gvId })
      .populate('HocSinh', 'MaHS HoTen Email GPA ChuyenNganh KyNang WalletAddress DaCapNhatHoSo')
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiaoVien', 'HoTen MaGV');

    // Flatten: mỗi item = { hocSinh, lopHoc info }
    const flatList = [];
    for (const lh of lopHocs) {
      for (const sv of (lh.HocSinh || [])) {
        flatList.push({
          hocSinh: sv,
          lopHoc: {
            _id: lh._id,
            MaLopHoc: lh.MaLopHoc,
            TenLopHoc: lh.TenLopHoc
          },
          monHoc: lh.MonHoc,
          giaoVien: lh.GiaoVien
        });
      }
    }

    res.json({ success: true, data: flatList });
  } catch (error) {
    logger.error(`[LopHoc] getHocSinhByGiaoVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách học sinh theo giáo viên' });
  }
};

