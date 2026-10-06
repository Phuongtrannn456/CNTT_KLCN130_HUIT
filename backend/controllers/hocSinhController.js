const HocSinh = require('../models/HocSinh');
const Student = require('../models/Student');

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
        let item = await HocSinh.findById(req.params.id);
        if (!item) {
            const student = await Student.findById(req.params.id);
            if (student) {
                // Map Student fields to HocSinh format
                item = {
                    _id: student._id,
                    HoTen: student.fullName,
                    MaHS: student.studentId,
                    Email: student.email,
                    GPA: student.gpa || 0,
                    ChuyenNganh: student.school || '',
                    KhoiLop: student.gradeLevel || null,
                    KyNang: student.skills || [],
                    BangDiemKyNang: [],
                    DaCapNhatHoSo: student.profileUpdated,
                    WalletAddress: student.walletAddress
                };
            }
        }
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
        const updated = await HocSinh.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
        const { HoTen, MaHS, Email, GPA, ChuyenNganh, BangDiemKyNang, KhoiLop } = req.body;

        // Validate fields cơ bản
        if (!HoTen || !MaHS || !Email) {
            return res.status(400).json({ error: 'Họ tên, Mã SV và Email là bắt buộc.' });
        }

        if (GPA === undefined || GPA === null || GPA === '') {
            return res.status(400).json({ error: 'Vui lòng nhập GPA để hệ thống AI có thể gợi ý đề tài chính xác.' });
        }

        if (!BangDiemKyNang || !Array.isArray(BangDiemKyNang) || BangDiemKyNang.length === 0) {
            return res.status(400).json({ error: 'Vui lòng chọn và nhập điểm ít nhất 1 kỹ năng để SBERT có dữ liệu phân tích.' });
        }

        // Auto-generate KyNang string array for backward compatibility
        const KyNang = BangDiemKyNang.map(item => item.TenKyNang).filter(Boolean);

        // Kiểm tra trùng MaHS với SV khác
        const duplicateMaHS = await HocSinh.findOne({ MaHS, _id: { $ne: id } });
        if (duplicateMaHS) {
            return res.status(400).json({ error: 'Mã SV đã tồn tại trong hệ thống.' });
        }

        // Kiểm tra trùng Email với SV khác
        const duplicateEmail = await HocSinh.findOne({ Email, _id: { $ne: id } });
        if (duplicateEmail) {
            return res.status(400).json({ error: 'Email đã tồn tại trong hệ thống.' });
        }

        let updated = await HocSinh.findByIdAndUpdate(id, {
            HoTen,
            MaHS,
            Email,
            GPA: GPA || 0,
            ChuyenNganh: ChuyenNganh || '',
            KhoiLop: KhoiLop || null,
            KyNang: KyNang || [],
            BangDiemKyNang: BangDiemKyNang || [],
            DaCapNhatHoSo: true
        }, { new: true });

        let studentUpdated = await Student.findByIdAndUpdate(id, {
            fullName: HoTen,
            studentId: MaHS,
            email: Email,
            gpa: GPA || 0,
            gradeLevel: KhoiLop || null,
            skills: KyNang || [],
            profileUpdated: true
        }, { new: true });

        if (!updated && !studentUpdated) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });

        const finalData = updated || studentUpdated;

        invalidateSvCache();
        res.json({ message: 'Cập nhật hồ sơ thành công!', data: finalData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Tìm học sinh theo MaHS (dùng cho chức năng mời vào nhóm)
exports.findByMaHS = async (req, res) => {
    try {
        const { maSV } = req.params;
        const sv = await HocSinh.findOne({ MaHS: maSV });
        if (!sv) return res.status(404).json({ error: 'Không tìm thấy học sinh với mã này.' });
        // Chỉ trả về thông tin cần thiết (không trả wallet)
        res.json({
            _id: sv._id,
            MaHS: sv.MaHS,
            HoTen: sv.HoTen,
            Email: sv.Email,
            GPA: sv.GPA,
            ChuyenNganh: sv.ChuyenNganh,
            KyNang: sv.KyNang,
            BangDiemKyNang: sv.BangDiemKyNang
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

