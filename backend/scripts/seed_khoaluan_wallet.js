require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../models/DeTai');
const GiangVien = require('../models/GiangVien');

async function seed() {
  console.log('🔗 Đang kết nối MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB thành công!');

  const walletAddr = '0xf56ca4437a2c3ae3a594ff8a2dd9aed8ec3f1289';

  // 1. Tìm giáo viên có ví khớp
  const gv = await GiangVien.findOne({ WalletAddress: new RegExp(`^${walletAddr}$`, 'i') });

  if (!gv) {
    console.error(`❌ Không tìm thấy Giáo viên nào có ví là ${walletAddr} trong DB!`);
    process.exit(1);
  }

  console.log(`✅ Đã tìm thấy giáo viên: ${gv.HoTen} (ID: ${gv._id})`);

  // 2. Tạo đề tài Dự Án STEM
  const topicData = {
    MaDeTai: 'DT_KL_WALLET_01',
    TenDeTai: 'Nghiên cứu giải pháp an toàn bảo mật và quản lý định danh số trên nền tảng Blockchain & AI',
    MoTa: 'Đề tài dự án STEM tốt nghiệp tập trung phát triển hệ thống định danh phi tập trung (DID) kết hợp trí tuệ nhân tạo để phân tích hành vi bất thường của các giao dịch on-chain.',
    MoTaChiTiet: 'Xây dựng giải pháp cấp phát Verifiable Credentials trên blockchain Ethereum và phát triển mô hình Machine Learning phát hiện tấn công sybil, giả mạo định danh.',
    YeuCau: ['Solidity', 'React', 'FastAPI', 'Cryptography', 'DID Architecture'],
    Deadline: new Date(new Date().setDate(new Date().getDate() + 90)),
    HanDangKy: new Date(new Date().setDate(new Date().getDate() + 15)),
    HanNopBaoCao: new Date(new Date().setDate(new Date().getDate() + 90)),
    GiangVienHuongDan: gv._id,
    MonHoc: null,
    LopHoc: [],
    CoBaiTest: true,
    TrangThai: 'MoDangKy',
    LoaiDeTai: 'KhoaLuan'
  };

  try {
    // Xóa đề tài cũ trùng mã nếu có để tránh lỗi unique index
    await DeTai.deleteOne({ MaDeTai: topicData.MaDeTai });
    
    const newTopic = await DeTai.create(topicData);
    console.log(`✅ Đã tạo thành công ĐỀ TÀI KHÓA LUẬN: ${newTopic.MaDeTai} - ${newTopic.TenDeTai}`);
  } catch (error) {
    console.error(`❌ Lỗi khi tạo đề tài dự án STEM:`, error);
  }

  console.log('🎉 Quá trình seed đề tài dự án STEM hoàn tất!');
  await mongoose.disconnect();
}

seed().catch(console.error);
