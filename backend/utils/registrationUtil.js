const DangKyDeTai = require('../models/DangKyDeTai');
const DeTai = require('../models/DeTai');

/**
 * Đóng tất cả các đăng ký cạnh tranh (cùng đề tài) khi đã có một đăng ký chiến thắng.
 * Các đăng ký khác ở trạng thái trung gian sẽ bị chuyển thành trạng thái loại (Thua).
 * @param {string} deTaiId - ID của đề tài
 * @param {string} winnerRegistrationId - ID của đăng ký chiến thắng
 * @param {object} session - (Tùy chọn) mongoose session dùng cho transaction
 * @param {string} rejectStatus - (Tùy chọn) trạng thái cập nhật cho các nhóm bị loại, mặc định là 'Thua'
 */
async function closeCompetingRegistrations(deTaiId, winnerRegistrationId, session = null, rejectStatus = 'Thua') {
    // Trạng thái 'Thua' được chọn làm trạng thái loại.
    // Dựa trên phân tích, enum của schema hỗ trợ 'TuChoi' và 'Thua', nhưng 'Thua' 
    // phản ánh chính xác ngữ cảnh "thi đấu thua cuộc" hoặc "bị loại do có nhóm khác nhanh hơn".
    const options = session ? { session } : {};
    return await DangKyDeTai.updateMany(
        { 
            DeTai: deTaiId, 
            _id: { $ne: winnerRegistrationId }, 
            TrangThai: { $in: ['ChoDuyet', 'ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi'] } 
        },
        { TrangThai: rejectStatus },
        options
    );
}

/**
 * Khóa đề tài nguyên tử cho một đăng ký chiến thắng.
 * Nếu thành công, trả về thông tin đề tài cũ để dùng cho rollback.
 */
async function claimTopicForRegistration(deTaiId, dangKyId, nhomId) {
    const oldDeTai = await DeTai.findOneAndUpdate(
        { _id: deTaiId, TrangThai: 'MoDangKy' },
        { TrangThai: 'DaChot', DangKyThang: dangKyId, NhomThang: nhomId }
    );
    return oldDeTai; // Trả về null nếu đã bị chốt, trả về doc cũ nếu thành công
}

/**
 * Rollback khóa đề tài trong trường hợp lỗi khi chốt Đăng ký.
 */
async function rollbackTopicClaim(deTaiId, dangKyId, oldTrangThai) {
    await DeTai.findOneAndUpdate(
        { _id: deTaiId, DangKyThang: dangKyId },
        { TrangThai: oldTrangThai || 'MoDangKy', DangKyThang: null, NhomThang: null }
    );
}

/**
 * Quét các đề tài DaChot nhưng vẫn còn đăng ký ở trạng thái chờ (ChoDuyet, ChoTest, DangLamTest, DaSubmit, ChoDoi)
 * và chuyển các đăng ký đó sang Thua.
 */
async function sweepClosedTopics() {
    const closedTopics = await DeTai.find({ TrangThai: 'DaChot' }).select('_id DangKyThang');
    let totalUpdated = 0;
    
    for (const deTai of closedTopics) {
        if (!deTai.DangKyThang) continue;
        
        const result = await DangKyDeTai.updateMany(
            {
                DeTai: deTai._id,
                _id: { $ne: deTai.DangKyThang },
                TrangThai: { $in: ['ChoDuyet', 'ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi'] }
            },
            { TrangThai: 'Thua' }
        );
        totalUpdated += result.modifiedCount || 0;
    }
    
    return totalUpdated;
}

module.exports = { closeCompetingRegistrations, claimTopicForRegistration, rollbackTopicClaim, sweepClosedTopics };
