require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../models/DeTai');
const GiaoVien = require('../models/GiaoVien');
const DangKyDeTai = require('../models/DangKyDeTai');
const BaiTest = require('../models/BaiTest');
const HocSinh = require('../models/HocSinh');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. List all thesis topics
  const topics = await DeTai.find({ LoaiDeTai: 'KhoaLuan' }).populate('GiaoVienHuongDan');
  console.log('\n--- ALL THESIS TOPICS ---');
  for (const deTai of topics) {
    const test = await BaiTest.findOne({ DeTai: deTai._id });
    console.log({
      _id: deTai._id,
      MaDeTai: deTai.MaDeTai,
      TenDeTai: deTai.TenDeTai,
      GiaoVienHuongDan: deTai.GiaoVienHuongDan ? deTai.GiaoVienHuongDan.HoTen : 'N/A',
      CoBaiTest: deTai.CoBaiTest,
      HasTestRecord: !!test,
      TestTitle: test ? test.TieuDe : 'N/A'
    });
  }

  // 2. Find Tran Minh Anh
  const sv = await HocSinh.findOne({ HoTen: /Trần Minh Anh/i });
  console.log('\n--- SINH VIEN DETAILS ---');
  if (sv) {
    console.log({
      _id: sv._id,
      HoTen: sv.HoTen
    });

    // 4. Find Registrations for this student
    const regs = await DangKyDeTai.find({ HocSinh: sv._id }).populate({
      path: 'DeTai',
      populate: { path: 'GiaoVienHuongDan' }
    });
    console.log('\n--- REGISTRATIONS FOR STUDENT ---');
    regs.forEach(r => {
      console.log({
        regId: r._id,
        deTaiId: r.DeTai ? r.DeTai._id : 'N/A',
        MaDeTai: r.DeTai ? r.DeTai.MaDeTai : 'N/A',
        TenDeTai: r.DeTai ? r.DeTai.TenDeTai : 'N/A',
        TrangThai: r.TrangThai,
        GiaoVien: r.DeTai && r.DeTai.GiaoVienHuongDan ? r.DeTai.GiaoVienHuongDan.HoTen : 'N/A'
      });
    });
  } else {
    console.log('No student found named Trần Minh Anh');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
