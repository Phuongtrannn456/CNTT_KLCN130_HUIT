/**
 * Script Khởi tạo Dữ liệu Mẫu chuẩn cho Nền tảng Web3 Giáo Dục Phổ Thông
 * Chạy lệnh: npm run seed:pho-thong (hoặc node scripts/seed_giao_duc_pho_thong.js)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const GiaoVien = require('../models/GiaoVien');
const HocSinh = require('../models/HocSinh');
const MonHoc = require('../models/MonHoc');
const LopHoc = require('../models/LopHoc');
const DeTai = require('../models/DeTai');
const BaiTest = require('../models/BaiTest');
const Nhom = require('../models/Nhom');
const DangKyDeTai = require('../models/DangKyDeTai');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giaovien';

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
      await GiaoVien.findOneAndUpdate({ MaGV: t.MaGV }, t, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Giáo viên: ${t.HoTen} (${t.ChuyenNganh})`);
    }

    const gv1 = await GiaoVien.findOne({ MaGV: 'GV_TOAN_01' });
    const gv2 = await GiaoVien.findOne({ MaGV: 'GV_STEM_02' });

    // 2. Tạo Môn Học Phổ Thông
    console.log('\n--- 2. Tạo Môn học phổ thông ---');
    const subjects = [
      { MaMonHoc: 'MH_TOAN', TenMonHoc: 'Toán Học Phổ Thông', SoTinChi: 4, MoTa: 'Chương trình Toán học phát triển tư duy logic và giải quyết vấn đề', GiaoVien: gv1._id },
      { MaMonHoc: 'MH_TIN', TenMonHoc: 'Tin Học & Lập Trình Cơ Bản', SoTinChi: 3, MoTa: 'Lập trình tư duy thuật toán, ứng dụng công nghệ số và Web3', GiaoVien: gv1._id },
      { MaMonHoc: 'MH_STEM', TenMonHoc: 'Hoạt Động Giáo Dục STEM', SoTinChi: 3, MoTa: 'Chế tạo mô hình ứng dụng khoa học kỹ thuật thực tiễn', GiaoVien: gv2._id },
      { MaMonHoc: 'MH_VATLY', TenMonHoc: 'Vật Lý Thực Nghiệm', SoTinChi: 3, MoTa: 'Khảo sát và thực nghiệm các định luật cơ học, điện từ học', GiaoVien: gv2._id }
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
        GiaoVien: gv2._id,
        HocKy: 'Học kỳ 1 - 2026',
        NamHoc: '2026-2027',
        SiSoToiDa: 45
      },
      {
        MaLopHoc: 'LOP_11A2',
        TenLopHoc: 'Lớp 11A2 - Tin Học Ứng Dụng',
        MonHoc: mhTin._id,
        GiaoVien: gv1._id,
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
        MaHS: 'HS_1001',
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
        MaHS: 'HS_1102',
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
      await HocSinh.findOneAndUpdate({ MaHS: st.MaHS }, st, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Học sinh: ${st.HoTen} (${st.ChuyenNganh})`);
    }

    const hs1 = await HocSinh.findOne({ MaHS: 'HS_1001' });
    const hs2 = await HocSinh.findOne({ MaHS: 'HS_1102' });

    // Thêm học sinh vào lớp học
    await LopHoc.findByIdAndUpdate(lop10A1._id, { $addToSet: { HocSinh: hs1._id } });
    await LopHoc.findByIdAndUpdate(lop11A2._id, { $addToSet: { HocSinh: hs2._id } });

    // 5. Tạo Dự Án Học Tập & Đề Tài STEM Mẫu
    console.log('\n--- 5. Tạo Dự án học tập & Đề tài STEM mẫu ---');
    const projects = [
      {
        MaDeTai: 'DA_STEM_01',
        TenDeTai: 'Hệ thống đo chất lượng không khí trường học IoT tích hợp xác thực Web3',
        MoTa: 'Thiết kế trạm cảm biến đo nồng độ bụi PM2.5, nhiệt độ, độ ẩm và ghi nhận dữ liệu định kỳ lên Blockchain phục vụ cộng đồng học sinh.',
        YeuCau: ['Cảm biến IoT', 'Python', 'Xác thực Web3', 'Báo cáo khoa học'],
        Deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        GiaoVienHuongDan: gv2._id,
        LopHoc: [lop10A1._id],
        MonHoc: mhStem._id,
        LoaiDeTai: 'MonHoc',
        SoLuongHocSinh: 3,
        TrangThai: 'MoDangKy'
      },
      {
        MaDeTai: 'DA_AI_02',
        TenDeTai: 'Ứng dụng Trí tuệ nhân tạo phân loại rác thải tại nguồn trong trường phổ thông',
        MoTa: 'Xây dựng mô hình thị giác máy tính nhận diện rác vô cơ, hữu cơ và rác tái chế nhằm giáo dục ý thức bảo vệ môi trường cho học sinh.',
        YeuCau: ['Computer Vision', 'Python', 'Tư duy STEM'],
        Deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        GiaoVienHuongDan: gv1._id,
        LopHoc: [lop11A2._id],
        MonHoc: mhTin._id,
        LoaiDeTai: 'MonHoc',
        SoLuongHocSinh: 2,
        TrangThai: 'MoDangKy'
      },
      {
        MaDeTai: 'DA_KHKT_03',
        TenDeTai: 'Cuộc thi KHKT Học sinh: Sổ tay theo dõi tiến độ hoạt động sáng tạo số hóa Web3',
        MoTa: 'Dự án nghiên cứu cấp trường phục vụ cuộc thi sáng tạo KHKT cấp phổ thông, lưu vết quá trình nghiên cứu của học sinh bất biến trên Blockchain.',
        YeuCau: ['Web3', 'ReactJS', 'Hợp đồng thông minh', 'Thuyết trình KHKT'],
        Deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        GiaoVienHuongDan: gv1._id,
        LoaiDeTai: 'KhoaLuan',
        SoLuongHocSinh: 2,
        TrangThai: 'MoDangKy'
      },
      {
        MaDeTai: 'DT_STEM_DEMO',
        TenDeTai: 'Mô hình giám sát phòng học thông minh IoT & AI (Thực nghiệm tuyển chọn STEM)',
        MoTa: 'Ứng dụng vi điều khiển ESP32, cảm biến môi trường và thị giác máy tính AI để phân tích điều kiện học tập chuẩn STEM. Đề tài mở bài test trực tuyến đánh giá năng lực tư duy logic và liêm chính học thuật.',
        YeuCau: ['Python / C++', 'Cảm biến IoT', 'Webcam AI Proctoring', 'Web3 Credential'],
        Deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        GiaoVienHuongDan: gv1._id,
        LopHoc: [lop10A1._id],
        MonHoc: mhStem._id,
        LoaiDeTai: 'MonHoc',
        SoLuongHocSinh: 1,
        TrangThai: 'MoDangKy',
        CoBaiTest: true
      }
    ];

    for (const p of projects) {
      await DeTai.findOneAndUpdate({ MaDeTai: p.MaDeTai }, p, { upsert: true, new: true });
      console.log(`✓ Đã cập nhật Dự án: ${p.TenDeTai}`);
    }

    // 6. Tạo Bài Test Cạnh Tranh & Phòng Thi Mẫu Cho Đề Tài Demo
    console.log('\n--- 6. Tạo Bài Test tuyển chọn & Đăng ký cho Học sinh Demo ---');
    const demoDeTai = await DeTai.findOne({ MaDeTai: 'DT_STEM_DEMO' });
    if (demoDeTai) {
      await BaiTest.deleteOne({ DeTai: demoDeTai._id });
      const test = new BaiTest({
        DeTai: demoDeTai._id,
        TieuDe: 'Bài Đánh Giá Năng Lực Tuyển Chọn Đề Tài STEM AI & IoT',
        MoTa: 'Bài kiểm tra trực tuyến giám sát AI toàn diện (Webcam, chống gian lận đa màn hình, khóa phím tắt, còi báo động). Vui lòng duy trì toàn màn hình và bật camera trong suốt quá trình làm bài.',
        ThoiGianLam: 15,
        NguongDat: 70,
        CauHoi: [
          {
            LoaiCauHoi: 'TracNghiem',
            NoiDung: 'Trong mô hình IoT thu thập dữ liệu cảm biến DHT22 về trạm quan trắc trường học, giao thức truyền thông nhẹ nào thường được ưu tiên để tiết kiệm năng lượng và băng thông?',
            LuaChon: [
              'A. MQTT (Message Queuing Telemetry Transport)',
              'B. FTP (File Transfer Protocol)',
              'C. SMTP (Simple Mail Transfer Protocol)',
              'D. Telnet'
            ],
            DapAnDung: 'A',
            Diem: 3
          },
          {
            LoaiCauHoi: 'TracNghiem',
            NoiDung: 'Khi ghi nhận kết quả và chứng nhận học tập số lên mạng lưới Blockchain công khai, loại token nào phù hợp nhất để biểu thị thành tích gắn liền với danh tính học sinh (không thể chuyển nhượng)?',
            LuaChon: [
              'A. ERC-20 (Fungible Token)',
              'B. Soulbound Token (SBT) / Non-transferable ERC-721',
              'C. Bitcoin UTXO',
              'D. Meme Token'
            ],
            DapAnDung: 'B',
            Diem: 3
          },
          {
            LoaiCauHoi: 'Code',
            NoiDung: 'Viết một hàm Python `kiem_tra_nhiet_do(temp)`: nếu `temp > 35.0` thì trả về chuỗi "CANH_BAO_QUAT_KHO", nếu `temp < 18.0` trả về "CANH_BAO_LANH", còn lại trả về "BINH_THUONG".',
            DapAnDung: 'def kiem_tra_nhiet_do(temp):\n    if temp > 35.0:\n        return "CANH_BAO_QUAT_KHO"\n    elif temp < 18.0:\n        return "CANH_BAO_LANH"\n    return "BINH_THUONG"',
            Diem: 4
          }
        ]
      });
      await test.save();
      console.log(`✓ Đã cập nhật Bài Test tuyển chọn cho đề tài: ${demoDeTai.TenDeTai}`);

      // Tạo nhóm mẫu và đăng ký đề tài cho hs1 (HS_1001) để có thể vào test trực tiếp
      let demoNhom = await Nhom.findOne({ TenNhom: 'Nhóm STEM Tiên Phong 10A1' });
      if (!demoNhom) {
        demoNhom = new Nhom({
          TenNhom: 'Nhóm STEM Tiên Phong 10A1',
          TruongNhom: hs1._id,
          LopHoc: lop10A1._id,
          SoLuong: 1,
          DaChot: true,
          ThanhVien: [{
            HocSinh: hs1._id,
            VaiTro: 'TruongNhom',
            TrangThai: 'DaChapNhan'
          }]
        });
        await demoNhom.save();
      }

      await DangKyDeTai.findOneAndUpdate(
        { DeTai: demoDeTai._id, HocSinh: hs1._id },
        {
          DeTai: demoDeTai._id,
          Nhom: demoNhom._id,
          TruongNhom: hs1._id,
          HocSinh: hs1._id,
          ThanhVien: [{
            HocSinh: hs1._id,
            VaiTro: 'TruongNhom',
            TrangThaiTV: 'DaChapNhan'
          }],
          TrangThai: 'ChoTest',
          NgayDangKy: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`✓ Đã tạo Đăng ký đề tài sẵn sàng cho Học sinh Demo (${hs1.HoTen})`);
    }

    console.log('\n🎉 Hoàn tất khởi tạo dữ liệu mẫu Nền tảng Web3 Giáo Dục Phổ Thông!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi khởi tạo dữ liệu mẫu:', err);
    process.exit(1);
  }
}

seedGiaoDucPhoThong();
