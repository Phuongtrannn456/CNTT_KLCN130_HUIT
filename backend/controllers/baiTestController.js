const BaiTest = require('../models/BaiTest');
const KetQuaTest = require('../models/KetQuaTest');
const DeTai = require('../models/DeTai');
const { closeCompetingRegistrations, claimTopicForRegistration, rollbackTopicClaim } = require('../utils/registrationUtil');
const DangKyDeTai = require('../models/DangKyDeTai');
const logger = require('../config/logger');

// GV tạo bài test cho đề tài
exports.createTest = async (req, res) => {
    try {
        const { deTaiId, tieuDe, moTa, cauHoi, thoiGianLam, nguongDat } = req.body;

        const deTai = await DeTai.findById(deTaiId);
        if (!deTai) return res.status(404).json({ error: 'Không tìm thấy đề tài.' });

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
        const baiTest = await BaiTest.findOne({ DeTai: req.params.deTaiId }).populate('DeTai', 'TenDeTai MaDeTai');
        if (!baiTest) return res.status(404).json({ error: 'Chưa có bài test cho đề tài này.' });
        res.json(baiTest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy bài test cho SV (ẩn đáp án)
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

// SV (trưởng nhóm) bắt đầu làm bài → ChoTest chuyển sang DangLamTest
exports.startTest = async (req, res) => {
    try {
        const hocSinhId = req.user?.id || req.body.hocSinhId;
        const { nhomId } = req.body;

        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Tìm đăng ký hợp lệ của nhóm/SV cho đề tài
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
            return res.status(404).json({ error: 'Không tìm thấy đăng ký hợp lệ để làm bài test.' });
        }

        // #13: chỉ trưởng nhóm được làm/nộp bài test đại diện nhóm
        if (String(dangKy.TruongNhom) !== String(hocSinhId)) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm được làm bài test đại diện cho nhóm.', code: 'KHONG_PHAI_TRUONG_NHOM' });
        }

        if (dangKy.TrangThai === 'ChoTest') {
            await DangKyDeTai.findByIdAndUpdate(dangKy._id, { TrangThai: 'DangLamTest' });
        }

        logger.info(`[TEST] DangKy ${dangKy._id} started test for topic ${baiTest.DeTai}`);
        res.json({
            message: 'Bắt đầu làm bài test.',
            thoiGianBatDau: new Date(),
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

// SV nộp bài test → AI chấm tự động → Hybrid competition logic
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

        // === Kiểm tra thời gian làm bài (Server-side Timeout Enforcement) ===
        if (thoiGianBatDau && baiTest.ThoiGianLam) {
            const startTime = new Date(thoiGianBatDau).getTime();
            const now = Date.now();
            const elapsedMinutes = (now - startTime) / (60 * 1000);
            const graceMinutes = 2; // Cho phép 2 phút độ trễ mạng
            if (elapsedMinutes > baiTest.ThoiGianLam + graceMinutes) {
                return res.status(400).json({ error: 'Đã hết thời gian làm bài test.', code: 'TEST_TIMEOUT' });
            }
        }

        // === 1. GHI ThoiGianSubmit NGAY LẬP TỨC (trước khi AI chấm) ===
        const thoiGianSubmit = new Date();

        // Tìm đăng ký của nhóm/SV cho đề tài này
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

        // #13: chỉ trưởng nhóm được nộp bài test đại diện cho cả nhóm
        if (dangKy && String(dangKy.TruongNhom) !== String(hocSinhId)) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm được nộp bài test đại diện cho nhóm.', code: 'KHONG_PHAI_TRUONG_NHOM' });
        }

        // Cập nhật ThoiGianSubmit + TrangThai = DaSubmit
        if (dangKy) {
            await DangKyDeTai.findByIdAndUpdate(dangKy._id, {
                ThoiGianSubmit: thoiGianSubmit,
                TrangThai: 'DaSubmit'
            });
        }

        // === 2. AI CHẤM ĐIỂM ===
        const ketQuaTraLoi = [];
        let tongDiem = 0;
        let diemToiDa = 0;

        for (let i = 0; i < baiTest.CauHoi.length; i++) {
            const cauHoi = baiTest.CauHoi[i];
            const svAnswer = traLoi?.[i] || '';
            diemToiDa += cauHoi.Diem || 1;

            if (cauHoi.LoaiCauHoi === 'TracNghiem') {
                const isCorrect = svAnswer.toUpperCase().trim() === (cauHoi.DapAnDung || '').toUpperCase().trim();
                const diem = isCorrect ? (cauHoi.Diem || 1) : 0;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i, LoaiCauHoi: 'TracNghiem',
                    TraLoiText: svAnswer, Diem: diem, DiemToiDa: cauHoi.Diem || 1, DungSai: isCorrect
                });
            } else if (cauHoi.LoaiCauHoi === 'Code') {
                let similarity = 0;
                try {
                    const axios = require('axios');
                    const response = await axios.post(process.env.ML_SERVICE_URL ? `${process.env.ML_SERVICE_URL}/compare-code` : 'http://127.0.0.1:8001/compare-code', {
                        student_code: svAnswer, answer_code: cauHoi.DapAnMau || ''
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
                    TraLoiText: svAnswer, Diem: diem, DiemToiDa: cauHoi.Diem || 1,
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

        // === 4. LƯU KẾT QUẢ ===
        const ketQua = await KetQuaTest.create({
            BaiTest: baiTest._id,
            DeTai: baiTest.DeTai,
            HocSinh: hocSinhId,
            Nhom: nhomId || dangKy?.Nhom || null,
            DangKyDeTai: dangKy?._id || null,
            TraLoi: ketQuaTraLoi,
            TongDiem: Math.round(tongDiem * 100) / 100,
            DiemToiDa: diemToiDa,
            TxHash: txHash,
            ThoiGianBatDau: thoiGianBatDau ? new Date(thoiGianBatDau) : null,
            ThoiGianNop: thoiGianSubmit
        });

        // === 5. HYBRID COMPETITION LOGIC ===
        const phanTram = diemToiDa > 0 ? Math.round((tongDiem / diemToiDa) * 100) : 0;
        const nguongDat = baiTest.NguongDat || 75;
        const isDat = phanTram >= nguongDat;
        const io = req.app.get('io');
        let competitionResult = 'none';

        if (dangKy) {
            if (!isDat) {
                // Không đạt ngưỡng → TuChoi (chỉ update khi nhóm vẫn đang chờ kết quả chấm)
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

// GV xem kết quả tất cả SV cho 1 bài test
exports.getTestResults = async (req, res) => {
    try {
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

// Kiểm tra SV đã làm test chưa
exports.checkSubmitted = async (req, res) => {
    try {
        const { deTaiId, hocSinhId } = req.params;
        const baiTest = await BaiTest.findOne({ DeTai: deTaiId });
        if (!baiTest) return res.json({ hasTest: false });

        const result = await KetQuaTest.findOne({ BaiTest: baiTest._id, HocSinh: hocSinhId })
            .populate('DangKyDeTai');

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
