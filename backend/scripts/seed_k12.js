/**
 * Script Khởi tạo Dữ liệu Mẫu cho Nền tảng Web3 Giáo Dục Phổ Thông (K-12)
 * 
 * Sử dụng Models K-12 mới: Teacher, Student, Challenge
 * Không sử dụng Models legacy: GiangVien, SinhVien, DeTai
 * 
 * Chạy lệnh: node scripts/seed_k12.js
 * 
 * Wallet addresses: Sử dụng Hardhat default test accounts (deterministic).
 * KHÔNG chứa private key thật.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Challenge = require('../models/Challenge');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giangvien';

async function seedK12() {
  try {
    console.log('🔗 Đang kết nối MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công!');

    // ========================================
    // 1. Tạo Teacher (Giáo viên phổ thông)
    // ========================================
    console.log('\n--- 1. Tạo Teacher ---');
    const teachersData = [
      {
        teacherId: 'TC_TOAN_01',
        fullName: 'Thầy Nguyễn Văn Toàn',
        email: 'nguyenvantoan@thpt.edu.vn',
        department: 'Tổ Toán - Tin học',
        homeroomClass: '10A1',
        walletAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
      },
      {
        teacherId: 'TC_STEM_02',
        fullName: 'Cô Trần Thị Mai',
        email: 'tranthimai@thpt.edu.vn',
        department: 'Tổ Khoa Học Tự Nhiên & STEM',
        homeroomClass: '11A2',
        walletAddress: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
      }
    ];

    const teachers = [];
    for (const t of teachersData) {
      const doc = await Teacher.findOneAndUpdate(
        { teacherId: t.teacherId },
        t,
        { upsert: true, new: true }
      );
      teachers.push(doc);
      console.log(`  ✓ Teacher: ${doc.fullName} (${doc.department}) | wallet: ${doc.walletAddress}`);
    }

    // ========================================
    // 2. Tạo Student (Học sinh phổ thông)
    // ========================================
    console.log('\n--- 2. Tạo Student ---');
    const studentsData = [
      {
        studentId: 'ST_1001',
        fullName: 'Lê Minh Khôi',
        email: 'leminhkhoi@thpt.edu.vn',
        gradeLevel: 10,
        school: 'THPT Nguyễn Trãi',
        conduct: 'Tốt',
        gpa: 8.8,
        skills: ['Python Cơ Bản', 'Tư Duy Logic', 'Arduino'],
        walletAddress: '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        profileUpdated: true
      },
      {
        studentId: 'ST_1102',
        fullName: 'Phạm Thu Hà',
        email: 'phamthuha@thpt.edu.vn',
        gradeLevel: 11,
        school: 'THPT Nguyễn Trãi',
        conduct: 'Tốt',
        gpa: 8.5,
        skills: ['Thực Nghiệm Vật Lý', 'Phân Tích Dữ Liệu', 'Web3'],
        walletAddress: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
        profileUpdated: true
      },
      {
        studentId: 'ST_1203',
        fullName: 'Trần Quốc Bảo',
        email: 'tranquocbao@thpt.edu.vn',
        gradeLevel: 12,
        school: 'THPT Lê Quý Đôn',
        conduct: 'Khá',
        gpa: 7.5,
        skills: ['ReactJS', 'Lập Trình Web', 'Blockchain Cơ Bản'],
        walletAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
        profileUpdated: true
      }
    ];

    const students = [];
    for (const s of studentsData) {
      const doc = await Student.findOneAndUpdate(
        { studentId: s.studentId },
        s,
        { upsert: true, new: true }
      );
      students.push(doc);
      console.log(`  ✓ Student: ${doc.fullName} (Lớp ${doc.gradeLevel}) | wallet: ${doc.walletAddress}`);
    }

    // ========================================
    // 3. Tạo Challenge (Cuộc thi / Dự án)
    // ========================================
    console.log('\n--- 3. Tạo Challenge ---');
    const challengesData = [
      {
        challengeId: 'CHL-STEM-001',
        title: 'Hệ thống đo chất lượng không khí trường học IoT tích hợp Web3',
        description: 'Thiết kế trạm cảm biến đo nồng độ bụi PM2.5, nhiệt độ, độ ẩm và ghi nhận dữ liệu lên Blockchain.',
        requirements: ['Cảm biến IoT', 'Python', 'Xác thực Web3', 'Báo cáo khoa học'],
        eligibleGrades: [10, 11],
        maxTeamSize: 3,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdBy: teachers[1]._id, // Cô Trần Thị Mai
        subject: 'STEM',
        status: 'Open',
        challengeType: 'STEM',
        useRubrics: true,
        rubrics: [
          { criteriaName: 'Tính sáng tạo', description: 'Mức độ sáng tạo của giải pháp', weight: 30, maxScore: 10, aiKeywords: ['IoT', 'sáng tạo'] },
          { criteriaName: 'Kỹ thuật', description: 'Chất lượng kỹ thuật và code', weight: 40, maxScore: 10, aiKeywords: ['Python', 'Arduino', 'sensor'] },
          { criteriaName: 'Trình bày', description: 'Khả năng trình bày và báo cáo', weight: 30, maxScore: 10, aiKeywords: ['báo cáo', 'thuyết trình'] }
        ]
      },
      {
        challengeId: 'CHL-AI-002',
        title: 'Ứng dụng AI phân loại rác thải tại nguồn trong trường phổ thông',
        description: 'Xây dựng mô hình thị giác máy tính nhận diện rác nhằm giáo dục ý thức bảo vệ môi trường.',
        requirements: ['Computer Vision', 'Python', 'Tư duy STEM'],
        eligibleGrades: [11, 12],
        maxTeamSize: 2,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        createdBy: teachers[0]._id, // Thầy Nguyễn Văn Toàn
        subject: 'Tin học',
        status: 'Open',
        challengeType: 'Project'
      },
      {
        challengeId: 'CHL-WEB3-003',
        title: 'Cuộc thi KHKT: Sổ tay theo dõi hoạt động sáng tạo số hóa Web3',
        description: 'Dự án nghiên cứu cấp trường, lưu vết quá trình nghiên cứu của học sinh trên Blockchain.',
        requirements: ['Web3', 'ReactJS', 'Smart Contract', 'Thuyết trình KHKT'],
        eligibleGrades: [10, 11, 12],
        maxTeamSize: 3,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: teachers[0]._id, // Thầy Nguyễn Văn Toàn
        subject: 'Tin học',
        status: 'Open',
        challengeType: 'Competition'
      },
      {
        challengeId: 'CHL-MATH-004',
        title: 'Giải toán bằng lập trình Python',
        description: 'Sử dụng Python để giải các bài toán tổ hợp, xác suất thống kê cấp phổ thông.',
        requirements: ['Python', 'Toán học', 'Thuật toán cơ bản'],
        eligibleGrades: [10],
        maxTeamSize: 1,
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        createdBy: teachers[0]._id, // Thầy Nguyễn Văn Toàn
        subject: 'Toán',
        status: 'Open',
        challengeType: 'Project'
      }
    ];

    for (const c of challengesData) {
      const doc = await Challenge.findOneAndUpdate(
        { challengeId: c.challengeId },
        c,
        { upsert: true, new: true }
      );
      console.log(`  ✓ Challenge: ${doc.title}`);
      console.log(`    Môn: ${doc.subject} | Khối: ${doc.eligibleGrades.join(', ')} | Type: ${doc.challengeType}`);
    }

    // ========================================
    // Tổng kết
    // ========================================
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalChallenges = await Challenge.countDocuments();

    console.log('\n========================================');
    console.log('🎉 Hoàn tất seed K-12!');
    console.log(`   Teachers:   ${totalTeachers}`);
    console.log(`   Students:   ${totalStudents}`);
    console.log(`   Challenges: ${totalChallenges}`);
    console.log('========================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi seed K-12:', err.message || err);
    process.exit(1);
  }
}

seedK12();
