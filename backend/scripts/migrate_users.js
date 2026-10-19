const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/web3-k12');
  console.log('Connected to DB');

  // 1. Lấy dữ liệu từ các collection cũ trực tiếp không cần file Model
  const db = mongoose.connection.db;
  
  const admins = await db.collection('admins').find({}).toArray();
  const teachers = await db.collection('teachers').find({}).toArray();
  const students = await db.collection('students').find({}).toArray();

  console.log(`Tìm thấy: ${admins.length} Admin, ${teachers.length} Teacher, ${students.length} Student trong DB cũ`);

  for (const admin of admins) {
    if (!admin.WalletAddress) continue;
    await User.findOneAndUpdate(
      { walletAddress: admin.WalletAddress.toLowerCase() },
      { 
        role: 'admin', 
        fullName: admin.HoTen || 'System Admin',
        email: admin.Email || `${admin.WalletAddress.substring(0,6)}@admin.com`
      },
      { upsert: true }
    );
  }

  for (const teacher of teachers) {
    if (!teacher.walletAddress) continue;
    await User.findOneAndUpdate(
      { walletAddress: teacher.walletAddress.toLowerCase() },
      { 
        role: 'teacher', 
        fullName: teacher.fullName || 'Giáo Viên',
        schoolId: teacher.teacherId,
        department: teacher.department,
        email: teacher.email || `${teacher.walletAddress.substring(0,6)}@teacher.com`
      },
      { upsert: true }
    );
  }

  for (const student of students) {
    if (!student.walletAddress) continue;
    await User.findOneAndUpdate(
      { walletAddress: student.walletAddress.toLowerCase() },
      { 
        role: 'student', 
        fullName: student.fullName || 'Học Sinh',
        schoolId: student.studentId,
        gradeLevel: student.gradeLevel,
        email: student.email || `${student.walletAddress.substring(0,6)}@student.com`
      },
      { upsert: true }
    );
  }

  console.log('Migration hoàn tất! Đã đồng bộ tài khoản cũ sang bảng User mới.');
  process.exit(0);
}

migrate();
