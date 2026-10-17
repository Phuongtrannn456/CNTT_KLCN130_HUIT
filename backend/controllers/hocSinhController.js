const HocSinh = require('../models/HocSinh');

// Cache cho getAll - TTL 30 giay
let _svCache = { data: null, ts: 0 };
const SV_CACHE_TTL = 30 * 1000;

function invalidateSvCache() {
    _svCache = { data: null, ts: 0 };
}

exports.getAll = async (req, res) => {
    try {
        if (_svCache.data && Date.now() - _svCache.ts < SV_CACHE_TTL) {
            return res.json(_svCache.data);
        }

        const list = await HocSinh.find({});
        _svCache = { data: list, ts: Date.now() };
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const item = await HocSinh.findById(req.params.id);
        if(!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newSV = new HocSinh(req.body);
        await newSV.save();
        invalidateSvCache();
        res.status(201).json(newSV);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const targetId = req.params.id;
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role_id;

        // Chỉ chính học sinh đó hoặc ADMIN mới có quyền sửa
        let isAllowed = requesterRole === 'ADMIN_ROLE' || String(requesterId) === String(targetId);
        if (!isAllowed && req.user?.walletAddress) {
            const hs = await HocSinh.findById(targetId);
            if (hs && hs.WalletAddress?.toLowerCase() === req.user.walletAddress.toLowerCase()) {
                isAllowed = true;
            }
        }
        if (!isAllowed) {
            return res.status(403).json({ error: 'Bạn không có quyền sửa thông tin của học sinh này.' });
        }

        const updated = await HocSinh.findByIdAndUpdate(targetId, req.body, { new: true });
        invalidateSvCache();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await HocSinh.findByIdAndDelete(req.params.id);
        invalidateSvCache();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Học sinh cập nhật hồ sơ cá nhân (bắt buộc lần đầu)
exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role_id;

        // Chỉ chính học sinh đó hoặc ADMIN mới được cập nhật profile này
        let isProfileAllowed = requesterRole === 'ADMIN_ROLE' || String(requesterId) === String(id);
        if (!isProfileAllowed && req.user?.walletAddress) {
            const hs = await HocSinh.findById(id);
            if (hs && hs.WalletAddress?.toLowerCase() === req.user.walletAddress.toLowerCase()) {
                isProfileAllowed = true;
            }
        }
        if (!isProfileAllowed) {
            return res.status(403).json({ error: 'Bạn không có quyền cập nhật hồ sơ của học sinh này.' });
        }

        const { HoTen, MaHS, Email, GPA, ChuyenNganh, BangDiemKyNang, KhoiLop, gradeLevel, TruongHoc, school, HanhKiem } = req.body;

        // Validate fields cơ bản
        if (!HoTen || !MaHS || !Email) {
            return res.status(400).json({ error: 'Họ tên, Mã HS và Email là bắt buộc.' });
        }

        if (GPA === undefined || GPA === null || GPA === '') {
            return res.status(400).json({ error: 'Vui lòng nhập GPA/điểm trung bình để hệ thống AI có thể gợi ý đề tài chính xác.' });
        }

        if (!BangDiemKyNang || !Array.isArray(BangDiemKyNang) || BangDiemKyNang.length === 0) {
            return res.status(400).json({ error: 'Vui lòng chọn và nhập điểm ít nhất 1 kỹ năng để SBERT có dữ liệu phân tích.' });
        }

        // Auto-generate KyNang string array for backward compatibility
        const KyNang = BangDiemKyNang.map(item => item.TenKyNang).filter(Boolean);

        // Kiểm tra trùng MaHS với HS khác
        const duplicateMaHS = await HocSinh.findOne({ MaHS, _id: { $ne: id } });
        if (duplicateMaHS) {
            return res.status(400).json({ error: 'Mã HS đã tồn tại trong hệ thống.' });
        }

        // Kiểm tra trùng Email với HS khác
        const duplicateEmail = await HocSinh.findOne({ Email, _id: { $ne: id } });
        if (duplicateEmail) {
            return res.status(400).json({ error: 'Email đã tồn tại trong hệ thống.' });
        }

        const effectiveGrade = KhoiLop !== undefined && KhoiLop !== null && KhoiLop !== '' 
            ? Number(KhoiLop) 
            : (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '' ? Number(gradeLevel) : undefined);

        const updateData = {
            HoTen,
            MaHS,
            Email,
            GPA: GPA || 0,
            ChuyenNganh: ChuyenNganh || '',
            KyNang: KyNang || [],
            BangDiemKyNang: BangDiemKyNang || [],
            DaCapNhatHoSo: true
        };

        if (effectiveGrade !== undefined && !isNaN(effectiveGrade)) {
            updateData.KhoiLop = effectiveGrade;
        }
        if (TruongHoc || school) {
            updateData.TruongHoc = TruongHoc || school;
        }
        if (HanhKiem) {
            updateData.HanhKiem = HanhKiem;
        }

        const updated = await HocSinh.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });

        invalidateSvCache();
        res.json({ message: 'Cập nhật hồ sơ thành công!', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Tìm học sinh theo MaHS (dùng cho chức năng mời vào nhóm)
exports.findByMaHS = async (req, res) => {
    try {
        const maHocSinh = req.params.maHS;
        const hs = await HocSinh.findOne({ MaHS: maHocSinh });
        if (!hs) return res.status(404).json({ error: 'Không tìm thấy học sinh với mã này.' });
        // Chỉ trả về thông tin cần thiết (không trả wallet)
        res.json({
            _id: hs._id,
            MaHS: hs.MaHS,
            HoTen: hs.HoTen,
            Email: hs.Email,
            GPA: hs.GPA,
            ChuyenNganh: hs.ChuyenNganh,
            KyNang: hs.KyNang,
            BangDiemKyNang: hs.BangDiemKyNang
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

