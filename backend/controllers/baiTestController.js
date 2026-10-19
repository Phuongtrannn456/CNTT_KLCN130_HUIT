const BaiTest = require('../models/BaiTest');
const KetQuaTest = require('../models/KetQuaTest');
const DeTai = require('../models/DeTai');
const { closeCompetingRegistrations, claimTopicForRegistration, rollbackTopicClaim } = require('../utils/registrationUtil');
const DangKyDeTai = require('../models/DangKyDeTai');
const logger = require('../config/logger');

// Helper kiểm tra quyền sở hữu đề tài của giáo viên
async function checkTeacherOwnership(deTaiId, user) {
    if (!user) return false;
    if (user.role_id === 'ADMIN_ROLE') return true;
    const deTai = await DeTai.findById(deTaiId);
    if (!deTai) return false;
    if (String(deTai.GiaoVienHuongDan) === String(user.id)) return true;
    if (user.walletAddress) {
        const GiaoVien = require('../models/GiaoVien');
        const gv = await GiaoVien.findById(deTai.GiaoVienHuongDan);
        if (gv) {
            const gw = (gv.WalletAddress || '').toLowerCase();
            if (gw && gw === user.walletAddress.toLowerCase()) return true;
        }
    }
    return false;
}

// GV tạo bài test cho đề tài
exports.createTest = async (req, res) => {
    try {
        const { deTaiId, tieuDe, moTa, cauHoi, thoiGianLam, nguongDat } = req.body;

        const deTai = await DeTai.findById(deTaiId);
        if (!deTai) return res.status(404).json({ error: 'Không tìm thấy đề tài.' });

        // Kiểm tra quyền giáo viên phụ trách
        const isOwner = await checkTeacherOwnership(deTaiId, req.user);
        if (!isOwner) {
            return res.status(403).json({ error: 'Chỉ giáo viên hướng dẫn của đề tài hoặc Ban Giám Hiệu mới có quyền tạo bài test.' });
        }

        // Kiểm tra đã có bài test chưa
        const existing = await BaiTest.findOne({ DeTai: deTaiId });
        if (existing) return res.status(400).json({ error: 'Đề tài này đã có bài test. Vui lòng xóa bài cũ trước.' });

        const baiTest = await BaiTest.create({
            DeTai: deTaiId,
            TieuDe: tieuDe || `Bài test: ${deTai.TenDeTai}`,
            MoTa: moTa || '',
            CauHoi: cauHoi || [],
            ThoiGianLam: thoiGianLam || 30,
            NguongDat: nguongDat != null ? nguongDat : 75
        });

        // Đánh dấu đề tài có bài test
        await DeTai.findByIdAndUpdate(deTaiId, { CoBaiTest: true });

        // Chuyển tất cả đăng ký đang ChoDuyet → ChoTest
        await DangKyDeTai.updateMany(
            { DeTai: deTaiId, TrangThai: 'ChoDuyet' },
            { TrangThai: 'ChoTest' }
        );

        logger.info(`[TEST] Created test for topic ${deTaiId} | questions=${cauHoi?.length || 0}`);
        res.status(201).json({ message: 'Tạo bài test thành công', data: baiTest });
    } catch (err) {
        logger.error(`[TEST] Create failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Lấy bài test theo đề tài
exports.getTestByTopic = async (req, res) => {
    try {
        const isOwner = await checkTeacherOwnership(req.params.deTaiId, req.user);
        if (!isOwner) {
            return res.status(403).json({ error: 'Chỉ giáo viên phụ trách đề tài hoặc Ban Giám Hiệu mới có quyền truy cập.' });
        }

        const baiTest = await BaiTest.findOne({ DeTai: req.params.deTaiId }).populate('DeTai', 'TenDeTai MaDeTai');
        if (!baiTest) return res.status(404).json({ error: 'Chưa có bài test cho đề tài này.' });
        res.json(baiTest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy bài test cho HS (ẩn đáp án)
exports.getTestForStudent = async (req, res) => {
    try {
        const baiTest = await BaiTest.findOne({ DeTai: req.params.deTaiId }).populate('DeTai', 'TenDeTai MaDeTai');
        if (!baiTest) return res.status(404).json({ error: 'Chưa có bài test cho đề tài này.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Ẩn đáp án đúng và code mẫu
        const safeCauHoi = baiTest.CauHoi.map(c => ({
            LoaiCauHoi: c.LoaiCauHoi,
            NoiDung: c.NoiDung,
            LuaChon: c.LuaChon,
            NgonNgu: c.NgonNgu,
            Diem: c.Diem
            // KHÔNG trả DapAnDung, DapAnMau
        }));

        res.json({
            _id: baiTest._id,
            DeTai: baiTest.DeTai,
            TieuDe: baiTest.TieuDe,
            MoTa: baiTest.MoTa,
            CauHoi: safeCauHoi,
            ThoiGianLam: baiTest.ThoiGianLam,
            TrangThai: baiTest.TrangThai,
            NguongDat: baiTest.NguongDat,
            soCauHoi: baiTest.CauHoi.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// HS (trưởng nhóm) bắt đầu làm bài → ChoTest chuyển sang DangLamTest
exports.startTest = async (req, res) => {
    try {
        const hocSinhId = req.user?.id || req.body.hocSinhId;
        const { nhomId } = req.body;

        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Kiểm tra xem đề tài đã có người thắng hoặc đã chốt chưa
        const existingWinner = await DangKyDeTai.findOne({ DeTai: baiTest.DeTai, TrangThai: 'DaDuyet' });
        if (existingWinner) {
            return res.status(400).json({ error: 'Đề tài này đã có nhóm thi đạt và được duyệt. Bài test đã kết thúc.', code: 'TOPIC_ALREADY_ASSIGNED' });
        }
        const deTaiDoc = await DeTai.findById(baiTest.DeTai);
        if (deTaiDoc && deTaiDoc.TrangThai === 'DaChot') {
            return res.status(400).json({ error: 'Đề tài đã chốt danh sách thực hiện.', code: 'TOPIC_ALREADY_CLOSED' });
        }

        // Tìm đăng ký hợp lệ của nhóm/HS cho đề tài
        let dangKy = null;
        if (nhomId) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai, Nhom: nhomId,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] }
            });
        }
        if (!dangKy) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] },
                $or: [
                    { HocSinh: hocSinhId },
                    { TruongNhom: hocSinhId },
                    { 'ThanhVien.HocSinh': hocSinhId }
                ]
            });
        }
        if (!dangKy) {
            // Hỗ trợ tự động liên kết nếu là đề tài Demo hoặc bài test dùng thử trực tiếp
            if (deTaiDoc?.MaDeTai === 'DT_STEM_DEMO' || deTaiDoc?.TenDeTai?.includes('Thực nghiệm')) {
                dangKy = await DangKyDeTai.findOneAndUpdate(
                    { DeTai: baiTest.DeTai, HocSinh: hocSinhId },
                    {
                        DeTai: baiTest.DeTai,
                        HocSinh: hocSinhId,
                        TruongNhom: hocSinhId,
                        TrangThai: 'ChoTest',
                        NgayDangKy: new Date()
                    },
                    { upsert: true, new: true }
                );
            }
        }
        if (!dangKy) {
            return res.status(403).json({
                error: 'Bạn hoặc nhóm của bạn chưa đăng ký đề tài này.',
                code: 'CHUA_DANG_KY_DE_TAI'
            });
        }

        // #13: chỉ trưởng nhóm hoặc cá nhân đăng ký được làm bài test
        const isAuthorized = dangKy.TruongNhom ? String(dangKy.TruongNhom) === String(hocSinhId) : (dangKy.HocSinh ? String(dangKy.HocSinh) === String(hocSinhId) : true);
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc học sinh đăng ký được làm bài test đại diện cho nhóm.', code: 'KHONG_PHAI_TRUONG_NHOM' });
        }

        const thoiGianBatDau = new Date();
        await DangKyDeTai.findByIdAndUpdate(dangKy._id, { 
            TrangThai: 'DangLamTest',
            ThoiGianBatDau: thoiGianBatDau
        });

        logger.info(`[TEST] DangKy ${dangKy._id} started test for topic ${baiTest.DeTai} at ${thoiGianBatDau.toISOString()}`);
        res.json({
            message: 'Bắt đầu làm bài test.',
            thoiGianBatDau: thoiGianBatDau,
            thoiGianLam: baiTest.ThoiGianLam,
            dangKyId: dangKy._id
        });
    } catch (err) {
        logger.error(`[TEST] Start test failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// === HELPER: Xác định nhóm thắng (Hybrid) ===
async function tryClaimWinner(dangKyId, deTaiId, thoiGianSubmit, io) {
    // 1. Đã có nhóm thắng chưa?
    const existingWinner = await DangKyDeTai.findOne({ DeTai: deTaiId, TrangThai: 'DaDuyet' });
    if (existingWinner) {
        await DangKyDeTai.findByIdAndUpdate(dangKyId, { TrangThai: 'Thua' });
        return 'lost';
    }

    // 2. Có nhóm nào submit TRƯỚC mình mà chưa có kết quả không?
    const earlierPending = await DangKyDeTai.findOne({
        DeTai: deTaiId,
        _id: { $ne: dangKyId },
        TrangThai: 'DaSubmit',
        ThoiGianSubmit: { $lt: thoiGianSubmit }
    });

    if (earlierPending) {
        // Có người submit trước mình mà chưa biết pass/fail → chờ
        await DangKyDeTai.findByIdAndUpdate(dangKyId, { TrangThai: 'ChoDoi' });
        logger.info(`[TEST] DangKy ${dangKyId} waiting for earlier submission ${earlierPending._id}`);
        return 'waiting';
    }

    // Lấy thông tin nhóm từ đăng ký
    const dangKy = await DangKyDeTai.findById(dangKyId);
    if (!dangKy) return 'lost';

    // 3. Không ai trước mình → Claim winner (atomic trên DeTai)
    const oldDeTai = await claimTopicForRegistration(deTaiId, dangKyId, dangKy.Nhom);

    if (!oldDeTai) {
        // Đề tài đã chốt (ai đó đã claim trước) → thua
        await DangKyDeTai.findOneAndUpdate(
            { _id: dangKyId, TrangThai: { $in: ['DaSubmit', 'ChoDoi'] } },
            { TrangThai: 'Thua' }
        );
        return 'lost';
    }

    let isWinnerSet = false;
    try {
        // Đã lock thành công → Cập nhật thành DaDuyet
        const winner = await DangKyDeTai.findOneAndUpdate(
            { _id: dangKyId, TrangThai: { $in: ['DaSubmit', 'ChoDoi'] } },
            { TrangThai: 'DaDuyet' },
            { new: true }
        ).populate('Nhom');

        if (!winner) {
            // Rất hiếm: Nhóm không còn hợp lệ (bị xóa hoặc đã đổi trạng thái ngoài dự kiến)
            // Nhả khóa DeTai (Rollback)
            await rollbackTopicClaim(deTaiId, dangKyId, oldDeTai.TrangThai);
            return 'lost';
        }
        
        isWinnerSet = true;

        // THẮNG! → Đánh thua tất cả nhóm khác
        try {
            await closeCompetingRegistrations(deTaiId, dangKyId, null, 'Thua');
        } catch (err) {
            logger.error(`[TEST] closeCompetingRegistrations failed for topic ${deTaiId}: ${err.message}`);
        }
    } catch (error) {
        logger.error(`[TEST] Exception inside tryClaimWinner: ${error.message}`);
        if (!isWinnerSet) {
            await rollbackTopicClaim(deTaiId, dangKyId, oldDeTai.TrangThai);
        }
        return 'error';
    }

    // Đóng bài test
    const baiTest = await BaiTest.findOne({ DeTai: deTaiId });
    if (baiTest) await BaiTest.findByIdAndUpdate(baiTest._id, { TrangThai: 'DaDong' });

    // Invalidate cache đề tài ngay lập tức để đồng bộ UI
    try {
        const { invalidateDeTaiCache } = require('./deTaiController');
        if (typeof invalidateDeTaiCache === 'function') invalidateDeTaiCache();
    } catch (e) {
        // ignore cache invalidation failure
    }

    // Emit WebSocket
    if (io) {
        io.to(`competition:${deTaiId}`).emit('competition:winner', {
            deTaiId,
            winnerNhomId: winner.Nhom?._id?.toString(),
            winnerName: winner.Nhom?.TenNhom || 'Nhóm thắng cuộc'
        });
    }

    logger.info(`[TEST] 🏆 WINNER: DangKy ${dangKyId} for topic ${deTaiId}`);
    return 'winner';
}

// === HELPER: Giải phóng nhóm đang ChoDoi khi nhóm trước đó có kết quả ===
async function resolveWaitingGroups(deTaiId, io) {
    // Lấy các nhóm đang ChoDoi, sắp xếp theo ThoiGianSubmit sớm nhất
    const waitingGroups = await DangKyDeTai.find({
        DeTai: deTaiId,
        TrangThai: 'ChoDoi'
    }).sort({ ThoiGianSubmit: 1 });

    for (const group of waitingGroups) {
        // Còn ai submit trước group mà chưa có kết quả?
        const earlierPending = await DangKyDeTai.findOne({
            DeTai: deTaiId,
            _id: { $ne: group._id },
            TrangThai: 'DaSubmit',
            ThoiGianSubmit: { $lt: group.ThoiGianSubmit }
        });

        if (!earlierPending) {
            // Không còn ai trước → nhóm này có thể claim winner
            const result = await tryClaimWinner(group._id, deTaiId, group.ThoiGianSubmit, io);
            if (result === 'winner') break; // Đã có winner, dừng
        }
    }
}

// HS nộp bài test → AI chấm tự động → Hybrid competition logic
exports.submitTest = async (req, res) => {
    try {
        const { nhomId, traLoi, thoiGianBatDau } = req.body;
        const hocSinhId = req.user?.id || req.body.hocSinhId;
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Kiểm tra đã nộp chưa
        const existingResult = await KetQuaTest.findOne({ BaiTest: baiTest._id, HocSinh: hocSinhId });
        if (existingResult) return res.status(400).json({ error: 'Bạn đã nộp bài test này rồi.' });

        // Tìm đăng ký của nhóm/HS cho đề tài này
        let dangKy = null;
        if (nhomId) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai,
                Nhom: nhomId,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] }
            });
        }
        if (!dangKy) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] },
                $or: [
                    { HocSinh: hocSinhId },
                    { TruongNhom: hocSinhId },
                    { 'ThanhVien.HocSinh': hocSinhId }
                ]
            });
        }
        // === 1. GHI ThoiGianSubmit NGAY LẬP TỨC (trước khi AI chấm) ===
        const thoiGianSubmit = new Date();

        // === Kiểm tra thời gian làm bài trên Server (Server-side Timing & Anti-bot Check) ===
        const serverStartTime = dangKy?.ThoiGianBatDau || (thoiGianBatDau ? new Date(thoiGianBatDau) : null);
        if (serverStartTime && baiTest.ThoiGianLam) {
            const startTime = new Date(serverStartTime).getTime();
            const now = thoiGianSubmit.getTime();
            const elapsedMinutes = (now - startTime) / (60 * 1000);
            const graceMinutes = 2; // Cho phép 2 phút độ trễ mạng
            if (elapsedMinutes > baiTest.ThoiGianLam + graceMinutes) {
                return res.status(400).json({ error: 'Đã hết thời gian làm bài test.', code: 'TEST_TIMEOUT' });
            }
            // Anti-bot check: bài thi nhiều câu hỏi nhưng nộp dưới 10 giây
            const elapsedSeconds = (now - startTime) / 1000;
            if (baiTest.CauHoi.length >= 3 && elapsedSeconds < 10) {
                logger.warn(`[CHEAT DETECTED] Student ${hocSinhId} submitted in ${elapsedSeconds}s (bot script suspected).`);
                return res.status(400).json({
                    error: 'Phát hiện hành vi nộp bài quá nhanh bất thường (nghi vấn can thiệp bằng bot/script tự động). Bài thi bị hủy.',
                    code: 'SUSPICIOUS_BOT_SUBMIT'
                });
            }
        }
        if (!dangKy) {
            const deTaiDoc = await DeTai.findById(baiTest.DeTai);
            if (deTaiDoc?.MaDeTai === 'DT_STEM_DEMO' || deTaiDoc?.TenDeTai?.includes('Thực nghiệm')) {
                dangKy = await DangKyDeTai.findOneAndUpdate(
                    { DeTai: baiTest.DeTai, HocSinh: hocSinhId },
                    {
                        DeTai: baiTest.DeTai,
                        HocSinh: hocSinhId,
                        TruongNhom: hocSinhId,
                        TrangThai: 'DangLamTest',
                        NgayDangKy: new Date(),
                        ThoiGianBatDau: serverStartTime || new Date(Date.now() - 60000)
                    },
                    { upsert: true, new: true }
                );
            }
        }
        if (!dangKy) {
            return res.status(403).json({
                error: 'Bạn hoặc nhóm của bạn chưa đăng ký đề tài này.',
                code: 'CHUA_DANG_KY_DE_TAI'
            });
        }

        // #13: chỉ trưởng nhóm hoặc cá nhân đăng ký được nộp bài test đại diện cho cả nhóm
        const isSubmitAuthorized = dangKy ? (dangKy.TruongNhom ? String(dangKy.TruongNhom) === String(hocSinhId) : (dangKy.HocSinh ? String(dangKy.HocSinh) === String(hocSinhId) : true)) : true;
        if (dangKy && !isSubmitAuthorized) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc học sinh đăng ký được nộp bài test.', code: 'KHONG_PHAI_TRUONG_NHOM' });
        }

        // Cập nhật ThoiGianSubmit + TrangThai = DaSubmit (Atomic để tránh ghi đè kết quả nếu đề tài đã chốt)
        if (dangKy) {
            const updatedDangKy = await DangKyDeTai.findOneAndUpdate(
                { _id: dangKy._id, TrangThai: { $in: ['ChoTest', 'DangLamTest'] } },
                {
                    ThoiGianSubmit: thoiGianSubmit,
                    TrangThai: 'DaSubmit'
                },
                { new: true }
            );

            if (!updatedDangKy) {
                return res.status(409).json({
                    error: 'Bài test hoặc trạng thái đăng ký của bạn không còn hợp lệ (có thể đề tài đã được chốt cho nhóm khác hoặc thời gian làm bài đã kết thúc).',
                    code: 'TEST_ALREADY_CLOSED'
                });
            }
        }

        // === 2. AI CHẤM ĐIỂM ===
        const ketQuaTraLoi = [];
        let tongDiem = 0;
        let diemToiDa = 0;

        for (let i = 0; i < baiTest.CauHoi.length; i++) {
            const cauHoi = baiTest.CauHoi[i];
            const hsAnswer = traLoi?.[i] || '';
            diemToiDa += cauHoi.Diem || 1;

            if (cauHoi.LoaiCauHoi === 'TracNghiem') {
                const isCorrect = hsAnswer.toUpperCase().trim() === (cauHoi.DapAnDung || '').toUpperCase().trim();
                const diem = isCorrect ? (cauHoi.Diem || 1) : 0;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i, LoaiCauHoi: 'TracNghiem',
                    TraLoiText: hsAnswer, Diem: diem, DiemToiDa: cauHoi.Diem || 1, DungSai: isCorrect
                });
            } else if (cauHoi.LoaiCauHoi === 'Code') {
                let similarity = 0;
                try {
                    const axios = require('axios');
                    const response = await axios.post(process.env.ML_SERVICE_URL ? `${process.env.ML_SERVICE_URL}/compare-code` : 'http://127.0.0.1:8001/compare-code', {
                        student_code: hsAnswer, answer_code: cauHoi.DapAnMau || ''
                    }, {
                        headers: {
                            'X-Internal-Token': process.env.INTERNAL_TOKEN || '',
                            'X-Forwarded-For': req.ip
                        },
                        timeout: 15000 
                    });
                    similarity = response.data.similarity || 0;
                } catch (aiErr) {
                    logger.warn(`[TEST] SBERT compare-code failed: ${aiErr.message}`);
                }
                const diem = Math.round(similarity * (cauHoi.Diem || 1) * 100) / 100;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i, LoaiCauHoi: 'Code',
                    TraLoiText: hsAnswer, Diem: diem, DiemToiDa: cauHoi.Diem || 1,
                    AI_Similarity: Math.round(similarity * 100) / 100
                });
            }
        }

        // === 3. GHI BLOCKCHAIN (non-blocking) ===
        let txHash = null;
        try {
            const contractService = require('../services/thesisContractService');
            const scoreForChain = Math.round((tongDiem / diemToiDa) * 100);
            txHash = await contractService.submitTestResultOnChain(
                baiTest.DeTai.toString(), hocSinhId, scoreForChain / 10
            );
        } catch (bcErr) {
            logger.warn(`[TEST] Blockchain submit failed (non-blocking): ${bcErr.message}`);
        }

        // === 3b. TÍNH ĐIỂM NGHI VẤN GIAN LẬN AI ===
        const { soLanChuyenTab = 0, soLanThoatFullscreen = 0, lichSuViPham = [] } = req.body;
        let aiCheatScore = 0;
        aiCheatScore += (parseInt(soLanThoatFullscreen, 10) || 0) * 35;
        aiCheatScore += (parseInt(soLanChuyenTab, 10) || 0) * 25;
        if (Array.isArray(lichSuViPham) && lichSuViPham.length > 0) {
            aiCheatScore = Math.max(aiCheatScore, lichSuViPham.length * 20);
        }
        if (aiCheatScore > 100) aiCheatScore = 100;

        const { violationReason = '' } = req.body;
        let aiCheatAssessment = 'Liêm chính';
        let biHuyKetQua = false;
        let lyDoHuy = '';

        if (violationReason || aiCheatScore >= 50 || soLanThoatFullscreen >= 2 || soLanChuyenTab >= 2) {
            aiCheatAssessment = 'Vi phạm quy chế';
            aiCheatScore = 100;
            biHuyKetQua = true;
            lyDoHuy = violationReason || `Đình chỉ thi do vi phạm quy chế (${soLanThoatFullscreen} lần thoát toàn màn hình, ${soLanChuyenTab} lần đổi tab).`;
            tongDiem = 0; // Hủy toàn bộ điểm số
        } else if (aiCheatScore > 0) {
            aiCheatAssessment = 'Nghi vấn nhẹ';
        }

        // === 4. LƯU KẾT QUẢ ===
        const ketQua = await KetQuaTest.create({
            BaiTest: baiTest._id,
            DeTai: baiTest.DeTai,
            HocSinh: hocSinhId,
            Nhom: dangKy?.Nhom || nhomId || null,
            DangKyDeTai: dangKy?._id || null,
            TraLoi: ketQuaTraLoi,
            TongDiem: Math.round(tongDiem * 100) / 100,
            DiemToiDa: diemToiDa,
            TxHash: txHash,
            ThoiGianBatDau: thoiGianBatDau ? new Date(thoiGianBatDau) : null,
            ThoiGianNop: thoiGianSubmit,
            SoLanChuyenTab: parseInt(soLanChuyenTab, 10) || 0,
            SoLanThoatFullscreen: parseInt(soLanThoatFullscreen, 10) || 0,
            LichSuViPham: Array.isArray(lichSuViPham) ? lichSuViPham : [],
            AI_CheatScore: aiCheatScore,
            AI_CheatAssessment: aiCheatAssessment,
            BiHuyKetQua: biHuyKetQua,
            LyDoHuy: lyDoHuy
        });

        // === 5. HYBRID COMPETITION LOGIC ===
        const phanTram = (diemToiDa > 0 && !biHuyKetQua) ? Math.round((tongDiem / diemToiDa) * 100) : 0;
        const nguongDat = baiTest.NguongDat || 75;
        const isDat = !biHuyKetQua && (phanTram >= nguongDat);
        const io = req.app.get('io');
        let competitionResult = 'none';

        if (dangKy) {
            if (biHuyKetQua || !isDat) {
                // Vi phạm gian lận hoặc không đạt ngưỡng → TuChoi ngay lập tức
                const updatedStatus = await DangKyDeTai.findOneAndUpdate(
                    { _id: dangKy._id, TrangThai: { $in: ['DaSubmit', 'ChoDoi'] } },
                    { TrangThai: 'TuChoi' }
                );

                if (!updatedStatus) {
                    logger.info(`[TEST] Nhóm ${dangKy.Nhom || dangKy._id} rớt điểm test nhưng không update thành TuChoi do đã bị chốt Thua trước đó.`);
                    competitionResult = 'lost';
                } else {
                    competitionResult = 'rejected';
                    logger.info(`[TEST] REJECTED: ${hocSinhId} scored ${phanTram}% < ${nguongDat}%`);

                    // Kiểm tra nhóm ChoDoi có thể claim winner
                    await resolveWaitingGroups(baiTest.DeTai, io);

                    // Emit status update
                    if (io) {
                        io.to(`competition:${baiTest.DeTai}`).emit('competition:status', {
                            deTaiId: baiTest.DeTai.toString(),
                            nhomId: (nhomId || dangKy.Nhom || '').toString(),
                            status: 'TuChoi'
                        });
                    }
                }
            } else {
                // Đạt ngưỡng → tryClaimWinner (Hybrid)
                competitionResult = await tryClaimWinner(dangKy._id, baiTest.DeTai, thoiGianSubmit, io);
                if (competitionResult === 'error') {
                    logger.error(`[TEST] tryClaimWinner trả về lỗi cho đăng ký ${dangKy._id}. Xem log bên trong tryClaimWinner.`);
                    // Đưa nhóm về ChoDoi để không bị kẹt DaSubmit (chỉ update nếu hiện tại đang DaSubmit)
                    await DangKyDeTai.findOneAndUpdate(
                        { _id: dangKy._id, TrangThai: 'DaSubmit' },
                        { TrangThai: 'ChoDoi' }
                    );
                }
                logger.info(`[TEST] ${hocSinhId} scored ${phanTram}% >= ${nguongDat}% | competition=${competitionResult}`);
            }
        }

        logger.info(`[TEST] Student ${hocSinhId} submitted test | score=${tongDiem}/${diemToiDa} | txHash=${txHash || 'N/A'}`);

        // === 6. TRẢ KẾT QUẢ ===
        const messageMap = {
            'winner': '🏆 Chúc mừng! Nhóm bạn giành được đề tài!',
            'waiting': '⏳ Đạt ngưỡng! Đang chờ kết quả nhóm submit trước...',
            'lost': '😞 Đạt ngưỡng nhưng đã có nhóm khác thắng trước.',
            'rejected': '❌ Bạn chưa đạt ngưỡng yêu cầu.',
            'none': isDat ? 'Đạt ngưỡng yêu cầu!' : 'Chưa đạt ngưỡng yêu cầu.'
        };

        res.status(201).json({
            message: messageMap[competitionResult] || messageMap.none,
            data: ketQua,
            blockchainStatus: txHash ? 'success' : 'failed',
            autoResult: competitionResult,
            phanTram,
            nguongDat,
            isDat,
            competitionResult
        });
    } catch (err) {
        logger.error(`[TEST] Submit failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// GV xem kết quả tất cả HS cho 1 bài test
exports.getTestResults = async (req, res) => {
    try {
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });

        const isOwner = await checkTeacherOwnership(baiTest.DeTai, req.user);
        if (!isOwner) {
            return res.status(403).json({ error: 'Chỉ giáo viên phụ trách đề tài hoặc Ban Giám Hiệu mới có quyền xem kết quả test.' });
        }

        const results = await KetQuaTest.find({ BaiTest: req.params.id })
            .populate('HocSinh', 'HoTen MaHS Email')
            .populate('Nhom', 'TenNhom')
            .sort({ TongDiem: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV chọn nhóm thắng → auto-approve
exports.selectWinner = async (req, res) => {
    try {
        const { dangKyId } = req.body;
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });

        const isOwner = await checkTeacherOwnership(baiTest.DeTai, req.user);
        if (!isOwner) {
            return res.status(403).json({ error: 'Chỉ giáo viên phụ trách đề tài hoặc Ban Giám Hiệu mới có quyền chọn nhóm thắng.' });
        }

        const dangKy = await DangKyDeTai.findById(dangKyId);
        if (!dangKy) return res.status(404).json({ error: 'Không tìm thấy đăng ký.' });

        if (String(dangKy.DeTai) !== String(baiTest.DeTai)) {
            return res.status(400).json({ error: 'Đăng ký này không thuộc bài test của đề tài này.' });
        }

        if (['Thua', 'TuChoi'].includes(dangKy.TrangThai)) {
            return res.status(400).json({ error: 'Đăng ký này đã thua hoặc bị từ chối, không thể chọn thắng.' });
        }

        // Khóa đề tài nguyên tử
        const oldDeTai = await claimTopicForRegistration(baiTest.DeTai, dangKyId, dangKy.Nhom);
        if (!oldDeTai) {
            return res.status(400).json({ error: 'Đề tài này đã được chốt cho một nhóm khác.' });
        }

        let isWinnerSet = false;
        try {
            // Duyệt nhóm thắng với điều kiện trạng thái hiện tại
            const winner = await DangKyDeTai.findOneAndUpdate(
                { _id: dangKyId, TrangThai: { $in: ['ChoDuyet', 'ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi'] } },
                { TrangThai: 'DaDuyet' },
                { new: true }
            );

            if (!winner) {
                await rollbackTopicClaim(baiTest.DeTai, dangKyId, oldDeTai.TrangThai);
                return res.status(404).json({ error: 'Không thể cập nhật đăng ký này thành DaDuyet.' });
            }
            
            isWinnerSet = true;

            // Từ chối các nhóm còn lại
            try {
                await closeCompetingRegistrations(baiTest.DeTai, dangKyId, null, 'Thua');
            } catch (err) {
                logger.error(`[TEST] closeCompetingRegistrations failed for topic ${baiTest.DeTai}: ${err.message}`);
            }

            // Đóng bài test
            await BaiTest.findByIdAndUpdate(baiTest._id, { TrangThai: 'DaDong' });

            // Invalidate cache đề tài
            try {
                const { invalidateDeTaiCache } = require('./deTaiController');
                if (typeof invalidateDeTaiCache === 'function') invalidateDeTaiCache();
            } catch (e) {}

            logger.info(`[TEST] Winner selected: registration ${dangKyId} for topic ${baiTest.DeTai}`);
            res.json({ message: 'Đã chọn nhóm thắng và duyệt đề tài!' });
        } catch (err) {
            logger.error(`[TEST] Select winner exception: ${err.message}`);
            if (!isWinnerSet) {
                await rollbackTopicClaim(baiTest.DeTai, dangKyId, oldDeTai.TrangThai);
            }
            throw err;
        }
    } catch (err) {
        logger.error(`[TEST] Select winner failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Xóa bài test
exports.deleteTest = async (req, res) => {
    try {
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });

        const isOwner = await checkTeacherOwnership(baiTest.DeTai, req.user);
        if (!isOwner) {
            return res.status(403).json({ error: 'Chỉ giáo viên phụ trách đề tài hoặc Ban Giám Hiệu mới có quyền xóa bài test.' });
        }

        await KetQuaTest.deleteMany({ BaiTest: baiTest._id });
        await BaiTest.findByIdAndDelete(baiTest._id);
        await DeTai.findByIdAndUpdate(baiTest.DeTai, { CoBaiTest: false });

        // Rollback các nhóm đang kẹt ở trạng thái làm test về ChoDuyet
        await DangKyDeTai.updateMany(
            { DeTai: baiTest.DeTai, TrangThai: { $in: ['ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi'] } },
            { TrangThai: 'ChoDuyet' }
        );

        res.json({ message: 'Đã xóa bài test và cập nhật lại trạng thái đăng ký đề tài.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Hàm nội bộ được export để test tự động
if (process.env.NODE_ENV === 'test') {
    exports.tryClaimWinnerForTest = tryClaimWinner;
}

// Kiểm tra HS đã làm test chưa
exports.checkSubmitted = async (req, res) => {
    try {
        const { deTaiId, hocSinhId } = req.params;
        const baiTest = await BaiTest.findOne({ DeTai: deTaiId });
        if (!baiTest) return res.json({ hasTest: false });

        let result = await KetQuaTest.findOne({ BaiTest: baiTest._id, HocSinh: hocSinhId })
            .populate('DangKyDeTai');

        if (!result) {
            const dangKy = await DangKyDeTai.findOne({
                DeTai: deTaiId,
                $or: [
                    { HocSinh: hocSinhId },
                    { TruongNhom: hocSinhId },
                    { 'ThanhVien.HocSinh': hocSinhId }
                ]
            });
            if (dangKy) {
                result = await KetQuaTest.findOne({ BaiTest: baiTest._id, DangKyDeTai: dangKy._id })
                    .populate('DangKyDeTai');
            }
        }

        let competitionResult = undefined;
        if (result && result.DangKyDeTai) {
            const status = result.DangKyDeTai.TrangThai;
            if (status === 'DaDuyet') competitionResult = 'winner';
            else if (status === 'ChoDoi') competitionResult = 'waiting';
            else if (status === 'Thua') competitionResult = 'lost';
            else if (status === 'TuChoi') competitionResult = 'rejected';
        }

        res.json({
            hasTest: true,
            submitted: !!result,
            result: result ? {
                ...result.toObject(),
                competitionResult: competitionResult
            } : null,
            testId: baiTest._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Giáo viên/Admin cấp quyền làm lại bài test (hoặc HS tự reset trong môi trường test/demo)
exports.resetStudentTest = async (req, res) => {
    try {
        const deTaiId = req.params.deTaiId;
        const user = req.user;
        if (!user) return res.status(401).json({ error: 'Chưa đăng nhập', code: 'UNAUTHORIZED' });

        let targetHocSinhId = null;
        const isTeacherOrAdmin = user.role_id === 'TEACHER_ROLE' || user.role_id === 'ADMIN_ROLE';

        if (isTeacherOrAdmin) {
            const isOwner = await checkTeacherOwnership(deTaiId, user);
            if (!isOwner) {
                return res.status(403).json({ error: 'Chỉ giáo viên phụ trách đề tài hoặc Quản trị viên mới có quyền cấp quyền thi lại.' });
            }
            targetHocSinhId = req.body?.hocSinhId;
            if (!targetHocSinhId) {
                return res.status(400).json({ error: 'Vui lòng cung cấp mã học sinh cần cấp quyền thi lại.' });
            }
        } else {
            // Học sinh gọi: chỉ cho phép trong môi trường dev hoặc nếu có cờ demo
            const allowSelfReset = process.env.NODE_ENV !== 'production' || process.env.ALLOW_STUDENT_SELF_RESET === 'true';
            if (!allowSelfReset) {
                return res.status(403).json({ error: 'Chỉ giáo viên phụ trách mới có quyền cấp phép làm lại bài thi.' });
            }
            // Học sinh chỉ được reset chính mình, TUYỆT ĐỐI không được reset tài khoản khác (chống IDOR)
            targetHocSinhId = user.id;
        }

        await KetQuaTest.deleteMany({ DeTai: deTaiId, HocSinh: targetHocSinhId });
        await DangKyDeTai.updateMany(
            { DeTai: deTaiId, $or: [{ HocSinh: targetHocSinhId }, { TruongNhom: targetHocSinhId }] },
            { TrangThai: 'ChoTest', ThoiGianSubmit: null, ThoiGianBatDau: null }
        );

        logger.info(`[TEST] Reset test attempt for student ${targetHocSinhId} on topic ${deTaiId} by user ${user.id} (${user.role_id})`);
        res.json({ success: true, message: 'Đã xóa kết quả thi cũ, thí sinh có thể làm lại bài thi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

