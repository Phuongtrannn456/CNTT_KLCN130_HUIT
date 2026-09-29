/**
 * Script Khởi tạo Dữ liệu Mẫu chuẩn cho Nền tảng Web3 Giáo Dục Phổ Thông
 * Chạy lệnh: npm run seed:pho-thong (hoặc node scripts/seed_giao_duc_pho_thong.js)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const GiangVien = require('../models/GiangVien');
const SinhVien = require('../models/SinhVien');
const MonHoc = require('../models/MonHoc');
const LopHoc = require('../models/LopHoc');
const DeTai = require('../models/DeTai');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giangvien';

async function seedGiaoDucPhoThong() {
  try {
    console.log('🔗 Đang kết nối MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công!');

    // 1. Tạo Giáo Viên Mẫu
    console.log('\n--- 1. Tạo Giáo viên phổ thông mẫu ---');
    const teachers = [
      {
        MaGV: 'GV_TOAN_01',
        HoTen: 'Thầy Nguyễn Văn Toàn',
        Email: 'nguyenvantoan.toan@thpt.edu.vn',
        ChuyenNganh: 'Tổ Toán - Tin học',
        WalletAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
      },
      {
        MaGV: 'GV_STEM_02',
        HoTen: 'Cô Trần Thị Mai',
        Email: 'tranthimai.stem@thpt.edu.vn',
        ChuyenNganh: 'Tổ Khoa Học Tự Nhiên & STEM',
        WalletAddress: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
      }
    ];

    for (const t of teachers) {
      await GiangVien.findOneAndUpdate({ MaGV: t.MaGV }, t, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Giáo viên: ${t.HoTen} (${t.ChuyenNganh})`);
    }

    const gv1 = await GiangVien.findOne({ MaGV: 'GV_TOAN_01' });
    const gv2 = await GiangVien.findOne({ MaGV: 'GV_STEM_02' });

    // 2. Tạo Môn Học Phổ Thông
    console.log('\n--- 2. Tạo Môn học phổ thông ---');
    const subjects = [
      { MaMonHoc: 'MH_TOAN', TenMonHoc: 'Toán Học Phổ Thông', SoTinChi: 4, MoTa: 'Chương trình Toán học phát triển tư duy logic và giải quyết vấn đề', GiangVien: gv1._id },
      { MaMonHoc: 'MH_TIN', TenMonHoc: 'Tin Học & Lập Trình Cơ Bản', SoTinChi: 3, MoTa: 'Lập trình tư duy thuật toán, ứng dụng công nghệ số và Web3', GiangVien: gv1._id },
      { MaMonHoc: 'MH_STEM', TenMonHoc: 'Hoạt Động Giáo Dục STEM', SoTinChi: 3, MoTa: 'Chế tạo mô hình ứng dụng khoa học kỹ thuật thực tiễn', GiangVien: gv2._id },
      { MaMonHoc: 'MH_VATLY', TenMonHoc: 'Vật Lý Thực Nghiệm', SoTinChi: 3, MoTa: 'Khảo sát và thực nghiệm các định luật cơ học, điện từ học', GiangVien: gv2._id }
    ];

    for (const s of subjects) {
      await MonHoc.findOneAndUpdate({ MaMonHoc: s.MaMonHoc }, s, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Môn học: ${s.TenMonHoc}`);
    }

    const mhTin = await MonHoc.findOne({ MaMonHoc: 'MH_TIN' });
    const mhStem = await MonHoc.findOne({ MaMonHoc: 'MH_STEM' });

    // 3. Tạo Lớp Học Phổ Thông
    console.log('\n--- 3. Tạo Lớp học phổ thông ---');
    const classes = [
      {
        MaLopHoc: 'LOP_10A1',
        TenLopHoc: 'Lớp 10A1 - STEM Khoa Học Tự Nhiên',
        MonHoc: mhStem._id,
        GiangVien: gv2._id,
        HocKy: 'Học kỳ 1 - 2026',
        NamHoc: '2026-2027',
        SiSoToiDa: 45
      },
      {
        MaLopHoc: 'LOP_11A2',
        TenLopHoc: 'Lớp 11A2 - Tin Học Ứng Dụng',
        MonHoc: mhTin._id,
        GiangVien: gv1._id,
        HocKy: 'Học kỳ 1 - 2026',
        NamHoc: '2026-2027',
        SiSoToiDa: 45
      }
    ];

    for (const c of classes) {
      await LopHoc.findOneAndUpdate({ MaLopHoc: c.MaLopHoc }, c, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Lớp học: ${c.TenLopHoc}`);
    }

    const lop10A1 = await LopHoc.findOne({ MaLopHoc: 'LOP_10A1' });
    const lop11A2 = await LopHoc.findOne({ MaLopHoc: 'LOP_11A2' });

    // 4. Tạo Học Sinh Mẫu
    console.log('\n--- 4. Tạo Học sinh phổ thông mẫu ---');
    const students = [
      {
        MaSV: 'HS_1001',
        HoTen: 'Lê Minh Khôi',
        Email: 'leminhkhoi.hs@thpt.edu.vn',
        GPA: 8.8,
        ChuyenNganh: 'Khối 10 - Tự Nhiên',
        KyNang: ['Python Cơ Bản', 'Tư Duy Logic', 'Thiết Kế Mạch Arduino'],
        BangDiemKyNang: [
          { TenKyNang: 'Python Cơ Bản', Diem: 9.0 },
          { TenKyNang: 'Tư Duy Logic', Diem: 8.5 }
        ],
        WalletAddress: '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        DaCapNhatHoSo: true
      },
      {
        MaSV: 'HS_1102',
        HoTen: 'Phạm Thu Hà',
        Email: 'phamthuha.hs@thpt.edu.vn',
        GPA: 8.5,
        ChuyenNganh: 'Khối 11 - STEM',
        KyNang: ['Thực Nghiệm Vật Lý', 'Phân Tích Dữ Liệu', 'Web3'],
        BangDiemKyNang: [
          { TenKyNang: 'Thực Nghiệm Vật Lý', Diem: 8.5 },
          { TenKyNang: 'Web3', Diem: 8.0 }
        ],
        WalletAddress: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
        DaCapNhatHoSo: true
      }
    ];

    for (const st of students) {
      await SinhVien.findOneAndUpdate({ MaSV: st.MaSV }, st, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Học sinh: ${st.HoTen} (${st.ChuyenNganh})`);
    }

    const hs1 = await SinhVien.findOne({ MaSV: 'HS_1001' });
    const hs2 = await SinhVien.findOne({ MaSV: 'HS_1102' });

    // Thêm học sinh vào lớp học
    await LopHoc.findByIdAndUpdate(lop10A1._id, { $addToSet: { DanhSachSinhVien: hs1._id } });
    await LopHoc.findByIdAndUpdate(lop11A2._id, { $addToSet: { DanhSachSinhVien: hs2._id } });

    // 5. Tạo Dự Án Học Tập & Đề Tài STEM Mẫu
    console.log('\n--- 5. Tạo Dự án học tập & Đề tài STEM mẫu ---');
    const projects = [
      {
        MaDeTai: 'DA_STEM_01',
        TenDeTai: 'Hệ thống đo chất lượng không khí trường học IoT tích hợp xác thực Web3',
        MoTa: 'Thiết kế trạm cảm biến đo nồng độ bụi PM2.5, nhiệt độ, độ ẩm và ghi nhận dữ liệu định kỳ lên Blockchain phục vụ cộng đồng học sinh.',
        YeuCau: ['Cảm biến IoT', 'Python', 'Xác thực Web3', 'Báo cáo khoa học'],
        Deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        GiangVienHuongDan: gv2._id,
        LopHoc: [lop10A1._id],
        MonHoc: mhStem._id,
        LoaiDeTai: 'MonHoc',
        SoLuongSinhVien: 3,
        TrangThai: 'MoDangKy'
      },
      {
        MaDeTai: 'DA_AI_02',
        TenDeTai: 'Ứng dụng Trí tuệ nhân tạo phân loại rác thải tại nguồn trong trường phổ thông',
        MoTa: 'Xây dựng mô hình thị giác máy tính nhận diện rác vô cơ, hữu cơ và rác tái chế nhằm giáo dục ý thức bảo vệ môi trường cho học sinh.',
        YeuCau: ['Computer Vision', 'Python', 'Tư duy STEM'],
        Deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        GiangVienHuongDan: gv1._id,
        LopHoc: [lop11A2._id],
        MonHoc: mhTin._id,
        LoaiDeTai: 'MonHoc',
        SoLuongSinhVien: 2,
        TrangThai: 'MoDangKy'
      },
      {
        MaDeTai: 'DA_KHKT_03',
        TenDeTai: 'Cuộc thi KHKT Học sinh: Sổ tay theo dõi tiến độ hoạt động sáng tạo số hóa Web3',
        MoTa: 'Dự án nghiên cứu cấp trường phục vụ cuộc thi sáng tạo KHKT cấp phổ thông, lưu vết quá trình nghiên cứu của học sinh bất biến trên Blockchain.',
        YeuCau: ['Web3', 'ReactJS', 'Hợp đồng thông minh', 'Thuyết trình KHKT'],
        Deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        GiangVienHuongDan: gv1._id,
        LoaiDeTai: 'KhoaLuan',
        SoLuongSinhVien: 2,
        TrangThai: 'MoDangKy'
      }
    ];

    for (const p of projects) {
      await DeTai.findOneAndUpdate({ MaDeTai: p.MaDeTai }, p, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Dự án: ${p.TenDeTai}`);
    }

    console.log('\n🎉 Hoàn tất khởi tạo dữ liệu mẫu Nền tảng Web3 Giáo Dục Phổ Thông!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi khởi tạo dữ liệu mẫu:', err);
    process.exit(1);
  }
}

seedGiaoDucPhoThong();
