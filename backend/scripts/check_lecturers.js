require('dotenv').config();
const mongoose = require('mongoose');
const GiaoVien = require('../models/GiaoVien');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔗 Đã kết nối MongoDB.');

  const listers = await GiaoVien.find({});
  console.log('=== DANH SÁCH GIÁO VIÊN TRONG DB ===');
  listers.forEach(gv => {
    console.log(`- ID: ${gv._id} | HoTen: ${gv.HoTen} | Email: ${gv.Email} | MaGV: ${gv.MaGV}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
