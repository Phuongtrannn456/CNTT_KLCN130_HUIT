const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giaovien';

async function seedRoster() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // 1. Danh sách Học sinh chính thức của trường (K-12 Roster)
    const officialStudents = [
      {
        MaHS: 'HS1001',
        HoTen: 'Trần Thị Phương',
        Email: 'phuong.tt@school.edu.vn',
        KhoiLop: 10,
        TruongHoc: 'THPT Chuyên Khoa Học & STEM',
        ChuyenNganh: 'Khoa Học Tự Nhiên & STEM',
        KyNang: ['Python', 'Tư duy logic', 'STEM Robotics'],
        BangDiemKyNang: [
          { TenKyNang: 'Python', Diem: 9.0 },
          { TenKyNang: 'Tư duy logic', Diem: 8.5 }
        ],
        GPA: 8.8,
        HanhKiem: 'Tốt'
      },
      {
        MaHS: 'HS1002',
        HoTen: 'Nguyễn Gia Bảo',
        Email: 'bao.nguyen@school.edu.vn',
        KhoiLop: 10,
        TruongHoc: 'THPT Chuyên Khoa Học & STEM',
        ChuyenNganh: 'Tổ Hợp Tin Học & Công Nghệ',
        KyNang: ['Mạch Arduino / IoT', 'Python'],
        BangDiemKyNang: [
          { TenKyNang: 'Mạch Arduino / IoT', Diem: 8.5 }
        ],
        GPA: 8.2,
        HanhKiem: 'Tốt'
      },
      {
        MaHS: 'HS1003',
        HoTen: 'Lê Bảo Châu',
        Email: 'chau.le@school.edu.vn',
        KhoiLop: 10,
        TruongHoc: 'THPT Chuyên Khoa Học & STEM',
        ChuyenNganh: 'Toán & KHTN',
        KyNang: ['Tư duy logic', 'Thí nghiệm KHTN'],
        GPA: 8.6,
        HanhKiem: 'Tốt'
      },
      {
        MaHS: 'HS1101',
        HoTen: 'Võ Minh Trí',
        Email: 'tri.vo@school.edu.vn',
        KhoiLop: 11,
        TruongHoc: 'THPT Chuyên Khoa Học & STEM',
        ChuyenNganh: 'Robotics & Tự Động Hóa',
        KyNang: ['Python', 'Mạch Arduino / IoT', 'Web3 Cơ Bản'],
        GPA: 9.0,
        HanhKiem: 'Tốt'
      },
      {
        MaHS: 'HS1201',
        HoTen: 'Đặng Hoàng Nam',
        Email: 'nam.dang@school.edu.vn',
        KhoiLop: 12,
        TruongHoc: 'THPT Chuyên Khoa Học & STEM',
        ChuyenNganh: 'AI & Khoa Học Dữ Liệu',
        KyNang: ['Python', 'Tư duy logic', 'Web3 Cơ Bản'],
        GPA: 9.2,
        HanhKiem: 'Tốt'
      }
    ];

    for (const hs of officialStudents) {
      const existing = await HocSinh.findOne({ MaHS: hs.MaHS });
      if (!existing) {
        hs.WalletAddress = `0x0000000000000000000000000000000000000000_${hs.MaHS.toLowerCase()}`;
        hs.ActivationPin = '123456';
        hs.IsActivated = false;
        await HocSinh.create(hs);
        console.log(`[SEED] Added Student: ${hs.HoTen} (${hs.MaHS}) - PIN: 123456`);
      } else {
        if (!existing.IsActivated) {
          existing.ActivationPin = '123456';
          await existing.save();
        }
        console.log(`[EXISTS] Student ${hs.MaHS} (${existing.HoTen}) - PIN: ${existing.ActivationPin || 'Đã kích hoạt'}`);
      }
    }

    // 2. Danh sách Giáo viên chính thức của trường (Faculty Roster)
    const officialTeachers = [
      {
        MaGV: 'GV_TOAN_01',
        HoTen: 'Thầy Nguyễn Văn Toàn',
        Email: 'toan.nv@thpt.edu.vn',
        ChuyenNganh: 'Tổ Toán - Tin học',
        ToBoMon: 'Tổ Toán - Tin học',
        ActivationPin: '888888',
        IsActivated: false
      },
      {
        MaGV: 'GV_STEM_02',
        HoTen: 'Cô Trần Thị Mai',
        Email: 'mai.tt@thpt.edu.vn',
        ChuyenNganh: 'Tổ Khoa Học Tự Nhiên & STEM',
        ToBoMon: 'Tổ Khoa Học Tự Nhiên & STEM',
        ActivationPin: '888888',
        IsActivated: false
      }
    ];

    for (const gv of officialTeachers) {
      const existing = await GiaoVien.findOne({ MaGV: gv.MaGV });
      if (!existing) {
        gv.WalletAddress = `0x0000000000000000000000000000000000000000_${gv.MaGV.toLowerCase()}`;
        await GiaoVien.create(gv);
        console.log(`[SEED] Added Teacher: ${gv.HoTen} (${gv.MaGV}) - PIN: 888888`);
      } else {
        if (!existing.IsActivated) {
          existing.ActivationPin = '888888';
          await existing.save();
        }
        console.log(`[EXISTS] Teacher ${gv.MaGV} (${existing.HoTen}) - PIN: ${existing.ActivationPin || 'Đã kích hoạt'}`);
      }
    }

    console.log('\nSeed roster completed successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed roster error:', err);
  }
}

seedRoster();
