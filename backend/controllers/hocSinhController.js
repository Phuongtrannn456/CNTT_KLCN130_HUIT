const HocSinh = require('../models/HocSinh');
const logger = require('../config/logger');

// Cache cho getAll - TTL 30 giay
let _hsCache = { data: null, ts: 0 };
const HS_CACHE_TTL = 30 * 1000;

function invalidateHsCache() {
    _hsCache = { data: null, ts: 0 };
}

exports.getAll = async (req, res) => {
    try {
        if (_hsCache.data && Date.now() - _hsCache.ts < HS_CACHE_TTL) {
            return res.json(_hsCache.data);
        }

        const list = await HocSinh.find({});
        _hsCache = { data: list, ts: Date.now() };
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        let item = await HocSinh.findById(req.params.id);
        if (!item && req.user?.walletAddress) {
            item = await HocSinh.findOne({ WalletAddress: { $regex: new RegExp(`^${req.user.walletAddress}$`, 'i') } });
        }
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newHS = new HocSinh(req.body);
        await newHS.save();
        invalidateHsCache();
        res.status(201).json(newHS);
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
        invalidateHsCache();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await HocSinh.findByIdAndDelete(req.params.id);
        invalidateHsCache();
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

        // Auto-generate KyNang string array for backward compatibility if BangDiemKyNang provided
        const KyNang = Array.isArray(BangDiemKyNang) ? BangDiemKyNang.map(item => item.TenKyNang).filter(Boolean) : undefined;

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
            ChuyenNganh: ChuyenNganh || '',
            DaCapNhatHoSo: true
        };

        if (Array.isArray(BangDiemKyNang)) {
            updateData.BangDiemKyNang = BangDiemKyNang;
            if (KyNang) updateData.KyNang = KyNang;
        }

        // Chỉ ADMIN mới có quyền điều chỉnh GPA trực tiếp
        if (requesterRole === 'ADMIN_ROLE' && GPA !== undefined) {
            updateData.GPA = GPA;
        }

        if (effectiveGrade !== undefined && !isNaN(effectiveGrade)) {
            updateData.KhoiLop = effectiveGrade;
        }
        if (TruongHoc || school) {
            updateData.TruongHoc = TruongHoc || school;
        }
        if (HanhKiem) {
            updateData.HanhKiem = HanhKiem;
        }

        let updated = await HocSinh.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated && req.user?.walletAddress) {
            // Tìm theo WalletAddress nếu ID từ token thuộc database khác (ví dụ khi server chuyển Atlas sang Local)
            updated = await HocSinh.findOneAndUpdate(
                { WalletAddress: { $regex: new RegExp(`^${req.user.walletAddress}$`, 'i') } },
                updateData,
                { new: true }
            );
        }
        if (!updated && req.user?.walletAddress) {
            // Tự động tạo mới hồ sơ học sinh trên DB hiện tại nếu chưa tồn tại
            updateData.WalletAddress = req.user.walletAddress.toLowerCase();
            updateData.KhoiLop = updateData.KhoiLop || 10;
            updateData.TruongHoc = updateData.TruongHoc || 'THPT';
            updated = await HocSinh.create(updateData);
        }

        if (!updated) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });

        invalidateHsCache();
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

// Lấy Bảng Điểm Tổng Hợp Tất Cả Các Môn của Học Sinh (K-12 Transcript)
exports.getBangDiem = async (req, res) => {
    try {
        let hsId = req.params.hsId;
        if (!hsId || hsId === 'me') {
            hsId = req.user?.id;
        }

        if (!hsId) {
            return res.status(400).json({ success: false, message: 'Thiếu ID học sinh' });
        }

        let hs = await HocSinh.findById(hsId);
        if (!hs && req.user?.walletAddress) {
            hs = await HocSinh.findOne({ WalletAddress: req.user.walletAddress.toLowerCase() });
        }
        if (!hs) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
        }

        const actualHsId = hs._id;
        const LopHoc = require('../models/LopHoc');
        const DiemSo = require('../models/DiemSo');
        const DangKyDeTai = require('../models/DangKyDeTai');
        const EducationalCredential = require('../models/EducationalCredential');

        // 1. Tìm tất cả các lớp học / môn học mà học sinh đang theo học
        const lopHocs = await LopHoc.find({ HocSinh: actualHsId })
            .populate('MonHoc', 'MaMonHoc TenMonHoc MoTa')
            .populate('GiaoVien', 'MaGV HoTen Email ToBoMon ChuyenNganh');

        // 2. Lấy tất cả điểm số của học sinh (kể cả điểm nộp theo nhóm)
        let diemList = await DiemSo.find({ HocSinh: actualHsId })
            .populate('DeTai')
            .populate('BaoCao')
            .populate('GiaoVienCham', 'HoTen Email ToBoMon');

        // Fallback nhóm cho DiemSo
        const groupRegs = await DangKyDeTai.find({
            TrangThai: 'DaDuyet',
            'ThanhVien.HocSinh': actualHsId,
            'ThanhVien.TrangThaiTV': 'DaChapNhan'
        });

        for (const reg of groupRegs) {
            const leaderId = reg.TruongNhom?.toString();
            if (!leaderId || leaderId === actualHsId.toString()) continue;
            const deTaiId = reg.DeTai?.toString();
            if (!deTaiId) continue;

            const leaderGrades = await DiemSo.find({ HocSinh: leaderId, DeTai: deTaiId })
                .populate('DeTai')
                .populate('BaoCao')
                .populate('GiaoVienCham', 'HoTen Email ToBoMon');

            for (const lg of leaderGrades) {
                if (!diemList.some(d => d.DeTai?._id?.toString() === deTaiId)) {
                    diemList.push(lg);
                }
            }
        }

        // 3. Lấy tất cả đăng ký đề tài của học sinh
        const dangKys = await DangKyDeTai.find({
            $or: [
                { HocSinh: actualHsId },
                { TruongNhom: actualHsId },
                { 'ThanhVien.HocSinh': actualHsId }
            ]
        }).populate('DeTai');

        // 4. Lấy tất cả chứng nhận Web3 SBT
        let credentials = [];
        try {
            credentials = await EducationalCredential.find({
                student: actualHsId,
                status: 'ANCHORED'
            });
        } catch (credErr) {
            logger.warn(`[BangDiem] Lỗi truy vấn credentials: ${credErr.message}`);
        }

        // 5. Tổng hợp bảng điểm theo từng môn học
        let totalScore = 0;
        let gradedCount = 0;

        const standardK12Subjects = [
            { maMonHoc: 'TOAN', tenMonHoc: 'Toán Học', toBoMon: 'Tổ Toán', deTai: 'Bài tập định lượng & Mô hình Toán học' },
            { maMonHoc: 'VAN', tenMonHoc: 'Ngữ Văn', toBoMon: 'Tổ Ngữ Văn', deTai: 'Báo cáo thuyết trình văn học & đời sống' },
            { maMonHoc: 'ANH', tenMonHoc: 'Tiếng Anh', toBoMon: 'Tổ Ngoại Ngữ', deTai: 'Thuyết trình dự án STEM bằng Tiếng Anh' },
            { maMonHoc: 'TIN_STEM', tenMonHoc: 'Tin Học / Dự Án STEM', toBoMon: 'Tổ Tin Học & Công Nghệ', deTai: 'Hệ thống Web3 & AI Giáo Dục Phổ Thông' },
            { maMonHoc: 'LY', tenMonHoc: 'Vật Lý', toBoMon: 'Tổ Vật Lý', deTai: 'Thực nghiệm mạch điện & Cảm biến cơ học' },
            { maMonHoc: 'HOA', tenMonHoc: 'Hóa Học', toBoMon: 'Tổ Hóa Học', deTai: 'Khảo sát độ pH và Nồng độ dung dịch hữu cơ' },
            { maMonHoc: 'SINH', tenMonHoc: 'Sinh Học', toBoMon: 'Tổ Sinh Học', deTai: 'Mô hình sinh thái & Đa dạng sinh học' },
            { maMonHoc: 'SU_DIA', tenMonHoc: 'Lịch Sử & Địa Lý', toBoMon: 'Tổ Khoa Học Xã Hội', deTai: 'Báo cáo di sản văn hóa và dữ liệu địa lý số' },
            { maMonHoc: 'CONG_NGHE', tenMonHoc: 'Công Nghệ', toBoMon: 'Tổ Tin Học & Công Nghệ', deTai: 'Mô hình tự động hóa & Thiết kế kỹ thuật' }
        ];

        let danhSachMonHoc = [];

        if (lopHocs.length > 0) {
            danhSachMonHoc = lopHocs.map(lh => {
                const monHoc = lh.MonHoc;
                const giaoVien = lh.GiaoVien;

                const reg = dangKys.find(dk => {
                    const dt = dk.DeTai;
                    if (!dt) return false;
                    if (dt.LopHoc && Array.isArray(dt.LopHoc) && dt.LopHoc.some(lId => lId.toString() === lh._id.toString())) return true;
                    if (dt.MonHoc && dt.MonHoc.toString() === monHoc?._id?.toString()) return true;
                    return false;
                });

                const diemRecord = diemList.find(d => {
                    const dt = d.DeTai;
                    if (!dt) return false;
                    if (dt.LopHoc && Array.isArray(dt.LopHoc) && dt.LopHoc.some(lId => lId.toString() === lh._id.toString())) return true;
                    if (dt.MonHoc && dt.MonHoc.toString() === monHoc?._id?.toString()) return true;
                    if (reg && reg.DeTai && dt._id.toString() === (reg.DeTai._id || reg.DeTai).toString()) return true;
                    return false;
                });

                let diem = null;
                let aiScore = null;
                let trangThai = 'ChuaDangKy';
                let nhanXet = '';
                let txHash = null;
                let trangThaiBlockchain = 'ChuaGhi';
                let tenDeTai = reg?.DeTai?.TenDeTai || 'Chưa chọn dự án';

                if (diemRecord) {
                    diem = diemRecord.Diem;
                    aiScore = diemRecord.AI_Score;
                    nhanXet = diemRecord.NhanXet || '';
                    txHash = diemRecord.TxHash;
                    trangThaiBlockchain = diemRecord.TrangThaiBlockchain;
                    trangThai = 'DaCham';
                    tenDeTai = diemRecord.DeTai?.TenDeTai || tenDeTai;

                    totalScore += diem;
                    gradedCount += 1;
                } else if (reg) {
                    trangThai = reg.TrangThai === 'DaDuyet' ? 'DangThucHien' : 'ChoDuyet';
                }

                return {
                    lopHocId: lh._id,
                    maLopHoc: lh.MaLopHoc,
                    tenLopHoc: lh.TenLopHoc,
                    monHocId: monHoc?._id,
                    maMonHoc: monHoc?.MaMonHoc || 'MH',
                    tenMonHoc: monHoc?.TenMonHoc || 'Môn học',
                    giaoVien: {
                        id: giaoVien?._id,
                        maGV: giaoVien?.MaGV,
                        hoTen: giaoVien?.HoTen || 'Chưa phân công',
                        email: giaoVien?.Email,
                        toBoMon: giaoVien?.ToBoMon || giaoVien?.ChuyenNganh || 'Tổ bộ môn'
                    },
                    deTai: tenDeTai,
                    diemChinhThuc: diem,
                    diemAI: aiScore,
                    nhanXet,
                    trangThai,
                    txHash,
                    trangThaiBlockchain
                };
            });
        } else {
            // Khi học sinh chưa được gán vào LopHoc cụ thể, hiển thị danh mục môn học chuẩn K-12 của Khối
            danhSachMonHoc = standardK12Subjects.map((sub, idx) => ({
                lopHocId: `mock_${sub.maMonHoc}`,
                maLopHoc: `Khối ${hs.KhoiLop || 10}`,
                tenLopHoc: `Khối ${hs.KhoiLop || 10} - ${sub.tenMonHoc}`,
                monHocId: null,
                maMonHoc: sub.maMonHoc,
                tenMonHoc: sub.tenMonHoc,
                giaoVien: {
                    id: null,
                    maGV: 'GVBM',
                    hoTen: 'Đang xếp lớp',
                    email: 'bgh@school.edu.vn',
                    toBoMon: sub.toBoMon
                },
                deTai: sub.deTai,
                diemChinhThuc: null,
                diemAI: null,
                nhanXet: 'Đang theo học trong chương trình K-12',
                trangThai: 'DangHoc',
                txHash: null,
                trangThaiBlockchain: 'ChuaGhi'
            }));
        }

        // ĐTB chung thang 10
        const dtbChung = gradedCount > 0 ? Number((totalScore / gradedCount).toFixed(1)) : (hs.GPA || 0);

        let xepLoai = 'Chưa xếp loại';
        if (gradedCount > 0 || dtbChung > 0) {
            if (dtbChung >= 8.0) xepLoai = 'Giỏi / Tốt';
            else if (dtbChung >= 6.5) xepLoai = 'Khá';
            else if (dtbChung >= 5.0) xepLoai = 'Đạt';
            else xepLoai = 'Chưa đạt';
        }

        res.json({
            success: true,
            hocSinh: {
                id: hs._id,
                maHS: hs.MaHS,
                hoTen: hs.HoTen,
                email: hs.Email,
                khoiLop: hs.KhoiLop || 10,
                hanhKiem: hs.HanhKiem || 'Tốt',
                walletAddress: hs.WalletAddress,
                dtbChung,
                xepLoai,
                tongSoMon: lopHocs.length,
                soMonDaCoDiem: gradedCount,
                soHuyHieuWeb3: credentials.length
            },
            bangDiem: danhSachMonHoc
        });
    } catch (err) {
        logger.error(`[BangDiem] Lỗi lấy bảng điểm: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
};

